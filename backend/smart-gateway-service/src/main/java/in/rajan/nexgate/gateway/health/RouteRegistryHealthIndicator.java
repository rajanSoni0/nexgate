package in.rajan.nexgate.gateway.health;

import in.rajan.nexgate.gateway.configuration.ConfigurationRefreshState;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

@Component
public class RouteRegistryHealthIndicator implements HealthIndicator {
    private final ConfigurationRefreshState state;

    public RouteRegistryHealthIndicator(ConfigurationRefreshState state) {
        this.state = state;
    }

    @Override
    public Health health() {
        var snapshot = state.snapshot();
        Health.Builder builder = snapshot.initialized()
                ? ("READY".equals(snapshot.status()) ? Health.up() : Health.down())
                : Health.down();
        return builder
                .withDetail("registryInitialized", snapshot.initialized())
                .withDetail("activeRouteCount", snapshot.activeRouteCount())
                .withDetail("lastSuccessfulRefresh", snapshot.lastSuccessfulRefresh())
                .withDetail("configurationRefreshStatus", snapshot.status())
                .withDetail("message", snapshot.message())
                .build();
    }
}
