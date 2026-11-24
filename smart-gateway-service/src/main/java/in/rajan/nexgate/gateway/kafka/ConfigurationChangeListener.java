package in.rajan.nexgate.gateway.kafka;

import com.nexgate.common.events.ConfigurationChangeEvent;
import in.rajan.nexgate.gateway.configuration.ConfigurationRefreshState;
import in.rajan.nexgate.gateway.configuration.ManagementRouteClient;
import in.rajan.nexgate.gateway.configuration.RouteRegistryService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Component
public class ConfigurationChangeListener {
    private static final Logger log = LoggerFactory.getLogger(ConfigurationChangeListener.class);
    private final ManagementRouteClient managementRouteClient;
    private final RouteRegistryService registryService;
    private final ConfigurationRefreshState refreshState;
    private final ConcurrentMap<String, Long> knownVersions = new ConcurrentHashMap<>();

    public ConfigurationChangeListener(ManagementRouteClient managementRouteClient,
                                       RouteRegistryService registryService,
                                       ConfigurationRefreshState refreshState) {
        this.managementRouteClient = managementRouteClient;
        this.registryService = registryService;
        this.refreshState = refreshState;
    }

    @KafkaListener(topics = "gateway-configuration-events", groupId = "smart-gateway-route-refresh")
    public void onConfigurationChange(ConfigurationChangeEvent event) {
        if (!isValid(event)) {
            log.warn("Rejected invalid configuration-change notification eventId={}", event == null ? null : event.eventId());
            return;
        }
        String key = event.organizationId() == null ? event.routeId() : event.organizationId() + ":" + event.routeId();
        Long prior = knownVersions.putIfAbsent(key, event.configurationVersion());
        if (prior != null && prior >= event.configurationVersion()) {
            log.debug("Ignoring duplicate or out-of-order route notification route={} version={} prior={} ", event.routeId(), event.configurationVersion(), prior);
            return;
        }
        knownVersions.put(key, event.configurationVersion());
        try {
            var routes = managementRouteClient.fetchActiveRoutes();
            if (!registryService.replace(routes)) {
                refreshState.degraded("Management refresh rejected for " + event.routeId());
                return;
            }
            log.info("Refreshed authoritative route configuration after notification route={} version={}", event.routeId(), event.configurationVersion());
        } catch (RuntimeException ex) {
            knownVersions.put(key, prior == null ? 0L : prior);
            log.warn("Route refresh failed; retaining last-known-good registry route={} version={} reason={}",
                    event.routeId(), event.configurationVersion(), ex.getMessage());
            refreshState.degraded("Management refresh failed for " + event.routeId());
        }
    }

    boolean isValid(ConfigurationChangeEvent event) {
        return event != null && event.eventId() != null && !event.eventId().isBlank()
                && event.routeId() != null && !event.routeId().isBlank()
                && event.configurationVersion() >= 1;
    }
}
