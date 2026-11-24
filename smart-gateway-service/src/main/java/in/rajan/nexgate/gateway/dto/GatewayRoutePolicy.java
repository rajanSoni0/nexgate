package in.rajan.nexgate.gateway.dto;

import java.util.Set;

public record GatewayRoutePolicy(
        boolean authenticationRequired,
        Set<String> permittedRoles,
        boolean rateLimitEnabled,
        Integer rateLimitRequests,
        Integer rateLimitWindowSeconds,
        String rateLimitScope,
        int timeoutMs,
        boolean idempotencyEnabled,
        boolean rewriteEnabled,
        String rewriteTargetPrefix
) {}
