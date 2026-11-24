package in.rajan.nexgate.gateway.policy;

import in.rajan.nexgate.gateway.dto.GatewayRouteConfiguration;
import in.rajan.nexgate.gateway.error.GatewayException;
import in.rajan.nexgate.gateway.security.AuthorizationResult;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.http.HttpStatus;

public class RouteRateLimitService {
    private static final Logger log = LoggerFactory.getLogger(RouteRateLimitService.class);
    private final RedisRateLimiter limiter;

    public RouteRateLimitService(RedisRateLimiter limiter) {
        this.limiter = limiter;
    }

    public void enforce(GatewayRouteConfiguration route, AuthorizationResult authorization,
                        HttpServletRequest request) {
        if (!route.policy().rateLimitEnabled()) return;
        try {
            RateLimitDecision decision = limiter.check(route, authorization, request);
            if (!decision.allowed()) {
                throw new GatewayException(HttpStatus.TOO_MANY_REQUESTS,
                        "RATE_LIMIT_EXCEEDED", "The configured route request limit was exceeded",
                        "Retry-After", String.valueOf(decision.retryAfterSeconds()));
            }
        } catch (RedisConnectionFailureException ex) {
            log.error("Redis rate-limit decision unavailable for route {}", route.routeId());
            throw new GatewayException(HttpStatus.SERVICE_UNAVAILABLE,
                    "RATE_LIMIT_STORE_UNAVAILABLE", "The route policy store is temporarily unavailable");
        } catch (IllegalArgumentException ex) {
            throw new GatewayException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "INVALID_RATE_LIMIT_CONFIGURATION", "The route rate-limit configuration is invalid");
        }
    }
}
