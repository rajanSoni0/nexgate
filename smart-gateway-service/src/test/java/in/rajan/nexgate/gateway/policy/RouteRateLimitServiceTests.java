package in.rajan.nexgate.gateway.policy;

import in.rajan.nexgate.gateway.dto.GatewayRouteConfiguration;
import in.rajan.nexgate.gateway.dto.GatewayRoutePolicy;
import in.rajan.nexgate.gateway.error.GatewayException;
import in.rajan.nexgate.gateway.security.AuthorizationResult;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;

import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

class RouteRateLimitServiceTests {
    private GatewayRouteConfiguration route(boolean enabled) {
        GatewayRoutePolicy policy = new GatewayRoutePolicy(false, Set.of(), enabled, 2, 60,
                "ROUTE", 5000, false, false, null);
        return new GatewayRouteConfiguration(1L, 7L, "catalog", "Catalog", null, "/catalog/**",
                "http://target.test", true, Set.of("GET"), true, false, 1, policy, List.of());
    }

    @Test
    void disabledRouteSkipsRedis() {
        RedisRateLimiter limiter = mock(RedisRateLimiter.class);
        RouteRateLimitService service = new RouteRateLimitService(limiter);
        service.enforce(route(false), new AuthorizationResult(null, false), new MockHttpServletRequest());
        verifyNoInteractions(limiter);
    }

    @Test
    void rejectedRequestReturns429WithRetryAfter() {
        RedisRateLimiter limiter = mock(RedisRateLimiter.class);
        RouteRateLimitService service = new RouteRateLimitService(limiter);
        GatewayRouteConfiguration route = route(true);
        AuthorizationResult authorization = new AuthorizationResult(null, false);
        HttpServletRequest request = new MockHttpServletRequest();
        when(limiter.check(route, authorization, request)).thenReturn(new RateLimitDecision(false, 2, 3, 42));

        GatewayException ex = assertThrows(GatewayException.class,
                () -> service.enforce(route, authorization, request));
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, ex.status());
        assertEquals("42", ex.headers().get("Retry-After"));
    }

    @Test
    void redisFailureFailsClosedWith503() {
        RedisRateLimiter limiter = mock(RedisRateLimiter.class);
        RouteRateLimitService service = new RouteRateLimitService(limiter);
        GatewayRouteConfiguration route = route(true);
        HttpServletRequest request = new MockHttpServletRequest();
        when(limiter.check(route, null, request)).thenThrow(new RedisConnectionFailureException("redis unavailable"));

        GatewayException ex = assertThrows(GatewayException.class,
                () -> service.enforce(route, null, request));
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, ex.status());
    }
}
