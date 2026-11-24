package in.rajan.nexgate.management.dto.responseDto;

import java.util.Set;

public record RoutePolicyResponse(
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
