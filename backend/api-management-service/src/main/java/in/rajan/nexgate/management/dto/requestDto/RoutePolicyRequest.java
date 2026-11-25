package in.rajan.nexgate.management.dto.requestDto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

import java.util.Set;

public record RoutePolicyRequest(
        boolean authenticationRequired,
        Set<@Size(max = 50) String> permittedRoles,
        boolean rateLimitEnabled,
        @Min(1) Integer rateLimitRequests,
        @Min(1) Integer rateLimitWindowSeconds,
        @Size(max = 50) String rateLimitScope,
        @Min(1) @Max(300000) int timeoutMs,
        boolean idempotencyEnabled,
        boolean rewriteEnabled,
        @Size(max = 500) String rewriteTargetPrefix
) {}
