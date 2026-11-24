package in.rajan.nexgate.gateway.policy;

import in.rajan.nexgate.gateway.dto.GatewayRouteConfiguration;
import in.rajan.nexgate.gateway.security.AuthorizationResult;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;

import java.time.Instant;
import java.util.List;
import java.util.Locale;

public class RedisRateLimiter {
    private final StringRedisTemplate redisTemplate;
    private final RedisScript<List<Long>> script;

    @SuppressWarnings("unchecked")
    public RedisRateLimiter(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
        this.script = RedisScript.of(
                "local count = redis.call('INCR', KEYS[1]); "
                        + "if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[2]) end; "
                        + "local ttl = redis.call('TTL', KEYS[1]); "
                        + "if count > tonumber(ARGV[1]) then return {0, count, ttl} end; "
                        + "return {1, count, ttl};",
                (Class<List<Long>>) (Class<?>) List.class);
    }

    public RateLimitDecision check(GatewayRouteConfiguration route, AuthorizationResult authorization,
                                   HttpServletRequest request) {
        if (!route.policy().rateLimitEnabled()) {
            return new RateLimitDecision(true, 0, 0, 0);
        }
        long limit = route.policy().rateLimitRequests();
        long windowSeconds = route.policy().rateLimitWindowSeconds();
        if (limit < 1 || windowSeconds < 1) {
            throw new IllegalArgumentException("Invalid route rate-limit configuration");
        }

        long organizationId = route.organizationId() == null ? -1L : route.organizationId();
        long windowBucket = Instant.now().getEpochSecond() / windowSeconds;
        String scope = normalizeScope(route.policy().rateLimitScope());
        String identity = resolveIdentity(scope, route, authorization, request);
        String key = "nexgate:ratelimit:" + organizationId + ":" + sanitize(route.routeId()) + ":"
                + scope.toLowerCase(Locale.ROOT) + ":" + identity + ":" + windowBucket;

        try {
            List<Long> result = redisTemplate.execute(script, List.of(key),
                    String.valueOf(limit), String.valueOf(windowSeconds));
            if (result == null || result.size() < 3) {
                throw new RedisConnectionFailureException("Redis returned an invalid rate-limit result");
            }
            boolean allowed = result.get(0) == 1L;
            long count = result.get(1);
            long retryAfter = Math.max(1L, result.get(2));
            return new RateLimitDecision(allowed, limit, count, retryAfter);
        } catch (RedisConnectionFailureException ex) {
            throw ex;
        }
    }

    private String resolveIdentity(String scope, GatewayRouteConfiguration route,
                                   AuthorizationResult authorization,
                                   HttpServletRequest request) {
        if ("USER".equals(scope) && authorization != null && authorization.principal() != null) {
            return sanitize(authorization.principal().identity());
        }
        if ("IP".equals(scope)) return sanitize(request.getRemoteAddr());
        if ("TENANT".equals(scope)) return String.valueOf(route.organizationId() == null ? -1L : route.organizationId());
        return "route";
    }

    private String normalizeScope(String scope) {
        if (scope == null || scope.isBlank()) return "ROUTE";
        String normalized = scope.toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "USER", "IP", "TENANT" -> normalized;
            default -> "ROUTE";
        };
    }

    private String sanitize(String value) {
        if (value == null || value.isBlank()) return "unknown";
        String sanitized = value.replaceAll("[^A-Za-z0-9._~-]", "_");
        return sanitized.length() <= 128 ? sanitized : sanitized.substring(0, 128);
    }
}
