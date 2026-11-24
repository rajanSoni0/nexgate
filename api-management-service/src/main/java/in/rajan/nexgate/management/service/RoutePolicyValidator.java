package in.rajan.nexgate.management.service;

import in.rajan.nexgate.management.dto.requestDto.HeaderRuleRequest;
import in.rajan.nexgate.management.dto.requestDto.RouteRequest;
import in.rajan.nexgate.management.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.util.Locale;
import java.util.Set;

@Component
public class RoutePolicyValidator {
    private static final Set<String> METHODS = Set.of("GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS");
    private static final Set<String> APPLICATION_ROLES = Set.of("PLATFORM_ADMIN", "TENANT_ADMIN", "GATEWAY_SERVICE", "USER", "ADMIN");

    public void validate(RouteRequest request) {
        URI uri;
        try {
            uri = URI.create(request.targetUri());
        } catch (RuntimeException ex) {
            throw bad("Target URI is invalid");
        }
        if (uri.getScheme() == null || !(uri.getScheme().equalsIgnoreCase("http") || uri.getScheme().equalsIgnoreCase("https")) || uri.getHost() == null) {
            throw bad("Target URI must be an absolute HTTP or HTTPS URI");
        }
        if (!request.pathPattern().startsWith("/")) {
            throw bad("Path pattern must start with '/' ");
        }
        for (String method : request.allowedMethods()) {
            if (method == null || !METHODS.contains(method.toUpperCase(Locale.ROOT))) {
                throw bad("Invalid HTTP method: " + method);
            }
        }
        if (request.allowedMethods().stream().noneMatch(m -> m.equalsIgnoreCase("POST")) && request.policy().idempotencyEnabled()) {
            throw bad("POST idempotency requires POST in allowed methods");
        }
        if (request.policy().rateLimitEnabled()) {
            if (request.policy().rateLimitRequests() == null || request.policy().rateLimitRequests() < 1
                    || request.policy().rateLimitWindowSeconds() == null || request.policy().rateLimitWindowSeconds() < 1) {
                throw bad("Rate-limit request count and time window must be positive");
            }
        }
        if (request.policy().timeoutMs() < 1 || request.policy().timeoutMs() > 300000) {
            throw bad("Timeout must be between 1 and 300000 milliseconds");
        }
        if (request.policy().permittedRoles() != null) for (String role : request.policy().permittedRoles()) {
            if (!APPLICATION_ROLES.contains(role)) {
                throw bad("Unsupported application role: " + role);
            }
        }
        if (request.headerRules() != null) {
            for (HeaderRuleRequest rule : request.headerRules()) {
                if (rule.action().name().equals("ADD") || rule.action().name().equals("MODIFY")) {
                    if (rule.headerValue() == null || rule.headerValue().isBlank()) {
                        throw bad("Header value is required for ADD and MODIFY rules");
                    }
                }
                String name = rule.headerName().toLowerCase(Locale.ROOT);
                if (name.equals("authorization") || name.equals("cookie") || name.equals("set-cookie")) {
                    throw bad("Sensitive headers cannot be transformed: " + rule.headerName());
                }
            }
        }
    }

    private ApiException bad(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, message);
    }
}
