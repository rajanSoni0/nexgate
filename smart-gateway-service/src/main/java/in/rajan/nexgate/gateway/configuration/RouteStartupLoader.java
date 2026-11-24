package in.rajan.nexgate.gateway.configuration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
public class RouteStartupLoader implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(RouteStartupLoader.class);
    private final ManagementRouteClient client;
    private final RouteRegistryService registryService;

    public RouteStartupLoader(ManagementRouteClient client, RouteRegistryService registryService) {
        this.client = client;
        this.registryService = registryService;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            var routes = client.fetchActiveRoutes();
            if (routes.isEmpty()) log.warn("Management returned an empty active route configuration");
            if (!registryService.replace(routes)) throw new IllegalStateException("Invalid route configuration received during startup");
            if (routes.isEmpty()) log.warn("Management returned an empty active route configuration");
        } catch (RuntimeException ex) {
            throw new IllegalStateException("Management route loading failed; refusing to start", ex);
        }
    }
}
