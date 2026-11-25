package in.rajan.nexgate.gateway.policy;

import com.fasterxml.jackson.databind.ObjectMapper;
import in.rajan.nexgate.gateway.dto.GatewayRouteConfiguration;
import in.rajan.nexgate.gateway.dto.GatewayRoutePolicy;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class RedisIdempotencyServiceTests {
    private GatewayRouteConfiguration route() {
        GatewayRoutePolicy policy = new GatewayRoutePolicy(false, Set.of(), false, null, null, null,
                5000, true, false, null);
        return new GatewayRouteConfiguration(1L, 7L, "orders", "Orders", null, "/orders/**",
                "http://target.test", true, Set.of("POST"), true, false, 1, policy, List.of());
    }

    @Test
    void missingKeyReturns400() {
        RedisIdempotencyService service = service();
        RedisIdempotencyService.IdempotencyException ex = assertThrows(
                RedisIdempotencyService.IdempotencyException.class,
                () -> service.acquire(new MockHttpServletRequest("POST", "/orders"), route(), null));
        assertEquals(400, ex.status());
    }

    @Test
    void successfulCompletionAndReplay() throws Exception {
        StringRedisTemplate redis = mock(StringRedisTemplate.class, RETURNS_DEEP_STUBS);
        RedisIdempotencyService service = new RedisIdempotencyService(redis, new ObjectMapper(),
                new IdempotencyProperties(300));
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/orders");
        request.setContent("{\"item\":1}".getBytes(StandardCharsets.UTF_8));
        when(redis.opsForValue().get(anyString())).thenReturn(null);
        when(redis.opsForValue().setIfAbsent(anyString(), anyString(), any(java.time.Duration.class))).thenReturn(true);

        IdempotencyDecision acquired = service.acquire(request, route(), "key-1");
        assertEquals(IdempotencyDecision.Type.ACQUIRED, acquired.type());

        service.complete(request, route(), "key-1", 201, "created".getBytes(StandardCharsets.UTF_8),
                Map.of("X-Test", List.of("yes")));
    }

    @Test
    void differentPayloadReturns409() throws Exception {
        StringRedisTemplate redis = mock(StringRedisTemplate.class, RETURNS_DEEP_STUBS);
        RedisIdempotencyService service = new RedisIdempotencyService(redis, new ObjectMapper(),
                new IdempotencyProperties(300));
        ObjectMapper mapper = new ObjectMapper();
        String existing = mapper.writeValueAsString(Map.of(
                "state", "PROCESSING",
                "payloadFingerprint", "different-fingerprint",
                "response", Map.of()));
        when(redis.opsForValue().get(anyString())).thenReturn(existing);

        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/orders");
        request.setContent("{\"item\":2}".getBytes(StandardCharsets.UTF_8));
        RedisIdempotencyService.IdempotencyException ex = assertThrows(
                RedisIdempotencyService.IdempotencyException.class,
                () -> service.acquire(request, route(), "key-1"));
        assertEquals(409, ex.status());
    }

    @Test
    void concurrentDuplicateWhileProcessingReturns409() throws Exception {
        StringRedisTemplate redis = mock(StringRedisTemplate.class, RETURNS_DEEP_STUBS);
        RedisIdempotencyService service = new RedisIdempotencyService(redis, new ObjectMapper(),
                new IdempotencyProperties(300));
        ObjectMapper mapper = new ObjectMapper();
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/orders");
        request.setContent("{\"item\":1}".getBytes(StandardCharsets.UTF_8));
        String fingerprint = mapper.writeValueAsString(Map.of());
        String processing = mapper.writeValueAsString(Map.of(
                "state", "PROCESSING", "payloadFingerprint", "will-not-match", "response", Map.of()));
        when(redis.opsForValue().get(anyString())).thenReturn(null, processing);
        when(redis.opsForValue().setIfAbsent(anyString(), anyString(), any(java.time.Duration.class))).thenReturn(false);

        RedisIdempotencyService.IdempotencyException ex = assertThrows(
                RedisIdempotencyService.IdempotencyException.class,
                () -> service.acquire(request, route(), "key-1"));
        assertEquals(409, ex.status());
    }

    @Test
    void redisFailureReturns503() {
        StringRedisTemplate redis = mock(StringRedisTemplate.class, RETURNS_DEEP_STUBS);
        RedisIdempotencyService service = new RedisIdempotencyService(redis, new ObjectMapper(),
                new IdempotencyProperties(300));
        when(redis.opsForValue().get(anyString())).thenThrow(new org.springframework.data.redis.RedisConnectionFailureException("down"));
        RedisIdempotencyService.IdempotencyException ex = assertThrows(
                RedisIdempotencyService.IdempotencyException.class,
                () -> service.acquire(new MockHttpServletRequest("POST", "/orders"), route(), "key-1"));
        assertEquals(503, ex.status());
    }

    private RedisIdempotencyService service() {
        return new RedisIdempotencyService(mock(StringRedisTemplate.class, RETURNS_DEEP_STUBS),
                new ObjectMapper(), new IdempotencyProperties(300));
    }
}
