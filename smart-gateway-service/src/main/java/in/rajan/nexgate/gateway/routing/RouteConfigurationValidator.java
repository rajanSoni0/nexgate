package in.rajan.nexgate.gateway.routing;

import in.rajan.nexgate.gateway.dto.GatewayRouteConfiguration;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.util.Locale;
import java.util.Set;

@Component
public class RouteConfigurationValidator {
    private static final Set<String> METHODS = Set.of("GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS");

    public void validate(GatewayRouteConfiguration route) {
        if (route == null) throw new IllegalArgumentException("Route configuration cannot be null");
        if (route.routeId() == null || route.routeId().isBlank()) throw new IllegalArgumentException("Route ID is required");
        if (route.pathPattern() == null || !route.pathPattern().startsWith("/")) throw new IllegalArgumentException("Invalid route path pattern");
        if (route.allowedMethods() == null || route.allowedMethods().isEmpty()) throw new IllegalArgumentException("Allowed methods are required");
        for (String method : route.allowedMethods()) {
            if (!METHODS.contains(method.toUpperCase(Locale.ROOT))) throw new IllegalArgumentException("Invalid HTTP method: " + method);
        }
        try {
            URI target = URI.create(route.targetUri());
            if (target.getHost() == null || !(target.getScheme().equalsIgnoreCase("http") || target.getScheme().equalsIgnoreCase("https"))) {
                throw new IllegalArgumentException("Invalid target URI");
            }
        } catch (RuntimeException ex) {
            throw new IllegalArgumentException("Invalid target URI", ex);
        }
        if (route.policy() == null) throw new IllegalArgumentException("Route policy is required");
        if (route.policy().timeoutMs() < 1 || route.policy().timeoutMs() > 300_000) throw new IllegalArgumentException("Invalid route timeout");
        if (route.policy().rateLimitEnabled() && (route.policy().rateLimitRequests() == null || route.policy().rateLimitRequests() < 1
                || route.policy().rateLimitWindowSeconds() == null || route.policy().rateLimitWindowSeconds() < 1)) {
            throw new IllegalArgumentException("Invalid rate-limit configuration");
        }
        if (route.policy().idempotencyEnabled() && !route.allowedMethods().contains("POST")
                && !route.allowedMethods().contains("post")) {
            throw new IllegalArgumentException("Idempotency requires POST");
        }
    }
}
