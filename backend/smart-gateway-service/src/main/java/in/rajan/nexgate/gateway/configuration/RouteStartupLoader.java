package in.rajan.nexgate.gateway.configuration;

import in.rajan.nexgate.gateway.dto.GatewayRouteConfiguration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Loads the initial route configuration from API Management. Management may still be starting
 * when the gateway comes up, so fetch failures are retried a bounded number of times before the
 * gateway refuses to start. An invalid configuration is never retried.
 */
@Component
public class RouteStartupLoader implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(RouteStartupLoader.class);
    private final ManagementRouteClient client;
    private final RouteRegistryService registryService;
    private final int maxAttempts;
    private final long retryDelayMs;

    @Autowired
    public RouteStartupLoader(ManagementRouteClient client, RouteRegistryService registryService,
                              @Value("${nexgate.management.startup-max-attempts:30}") int maxAttempts,
                              @Value("${nexgate.management.startup-retry-delay-ms:2000}") long retryDelayMs) {
        this.client = client;
        this.registryService = registryService;
        this.maxAttempts = Math.max(1, maxAttempts);
        this.retryDelayMs = Math.max(0, retryDelayMs);
    }

    @Override
    public void run(ApplicationArguments args) {
        List<GatewayRouteConfiguration> routes = fetchWithRetry();
        if (routes.isEmpty()) log.warn("Management returned an empty active route configuration");
        if (!registryService.replace(routes)) {
            throw new IllegalStateException("Invalid route configuration received during startup");
        }
    }

    private List<GatewayRouteConfiguration> fetchWithRetry() {
        RuntimeException last = null;
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return client.fetchActiveRoutes();
            } catch (RuntimeException ex) {
                last = ex;
                log.warn("Management route loading failed (attempt {}/{}): {}", attempt, maxAttempts, ex.getMessage());
                if (attempt < maxAttempts) {
                    try {
                        Thread.sleep(retryDelayMs);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
            }
        }
        throw new IllegalStateException("Management route loading failed; refusing to start", last);
    }
}
