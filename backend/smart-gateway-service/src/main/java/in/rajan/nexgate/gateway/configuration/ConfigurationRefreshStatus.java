package in.rajan.nexgate.gateway.configuration;

import java.time.Instant;

public record ConfigurationRefreshStatus(
        boolean initialized,
        int activeRouteCount,
        Instant lastSuccessfulRefresh,
        String status,
        String message
) {}
