package in.rajan.nexgate.gateway.configuration;

import in.rajan.nexgate.gateway.dto.GatewayRouteConfiguration;
import in.rajan.nexgate.gateway.routing.RouteConfigurationValidator;
import in.rajan.nexgate.gateway.routing.RouteRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class RouteRegistryService {
    private static final Logger log = LoggerFactory.getLogger(RouteRegistryService.class);
    private final RouteRegistry registry;
    private final RouteConfigurationValidator validator;
    private final ConfigurationRefreshState refreshState;

    public RouteRegistryService(RouteRegistry registry, RouteConfigurationValidator validator, ConfigurationRefreshState refreshState) {
        this.registry = registry;
        this.validator = validator;
        this.refreshState = refreshState;
    }

    public synchronized boolean replace(List<GatewayRouteConfiguration> configurations) {
        if (configurations == null) {
            refreshState.degraded("Management returned null configuration");
            return false;
        }
        try {
            List<GatewayRouteConfiguration> normalized = new ArrayList<>();
            Set<String> routeIds = new HashSet<>();
            for (GatewayRouteConfiguration route : configurations) {
                if (route == null) continue;
                validator.validate(route);
                if (!route.active() || route.deleted()) continue;
                if (!routeIds.add(route.routeId())) throw new IllegalArgumentException("Duplicate active route ID: " + route.routeId());
                normalized.add(route);
            }
            registry.replace(normalized);
            int count = registry.activeRouteCount();
            refreshState.refreshed(count);
            log.info("Route registry refreshed atomically; active routes={}", count);
            return true;
        } catch (RuntimeException ex) {
            log.warn("Route refresh rejected; retaining last-known-good registry: {}", ex.getMessage());
            refreshState.degraded("Configuration refresh rejected: " + ex.getMessage());
            return false;
        }
    }

    public RouteRegistry registry() { return registry; }
}
