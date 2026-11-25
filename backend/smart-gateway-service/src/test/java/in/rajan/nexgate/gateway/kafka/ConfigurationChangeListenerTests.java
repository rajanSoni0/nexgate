package in.rajan.nexgate.gateway.kafka;

import com.nexgate.common.events.ConfigurationChangeEvent;
import in.rajan.nexgate.gateway.configuration.ConfigurationRefreshState;
import in.rajan.nexgate.gateway.configuration.ManagementRouteClient;
import in.rajan.nexgate.gateway.configuration.RouteRegistryService;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ConfigurationChangeListenerTests {
    private ConfigurationChangeEvent event(String id, String route, long version) {
        return new ConfigurationChangeEvent(id, 1L, route, version, "UPDATE", Instant.now(), "api-management", "/api/gateway/routes");
    }

    @Test
    void duplicateAndOutOfOrderNotificationsDoNotFetchAgain() {
        ManagementRouteClient client = mock(ManagementRouteClient.class);
        RouteRegistryService registry = mock(RouteRegistryService.class);
        when(registry.replace(any())).thenReturn(true);
        ConfigurationChangeListener listener = new ConfigurationChangeListener(client, registry, new ConfigurationRefreshState());

        listener.onConfigurationChange(event("a", "catalog", 3));
        listener.onConfigurationChange(event("b", "catalog", 3));
        listener.onConfigurationChange(event("c", "catalog", 2));

        verify(client, times(1)).fetchActiveRoutes();
    }

    @Test
    void managementFailureRetainsRefreshDegradedState() {
        ManagementRouteClient client = mock(ManagementRouteClient.class);
        RouteRegistryService registry = mock(RouteRegistryService.class);
        ConfigurationRefreshState state = new ConfigurationRefreshState();
        when(client.fetchActiveRoutes()).thenThrow(new IllegalStateException("management unavailable"));
        ConfigurationChangeListener listener = new ConfigurationChangeListener(client, registry, state);

        listener.onConfigurationChange(event("a", "catalog", 4));

        assertTrue(state.snapshot().status().equals("DEGRADED"));
        verify(registry, never()).replace(any());
    }

    @Test
    void kafkaListenerValidatesBeforeFetching() {
        ManagementRouteClient client = mock(ManagementRouteClient.class);
        RouteRegistryService registry = mock(RouteRegistryService.class);
        ConfigurationChangeListener listener = new ConfigurationChangeListener(client, registry, new ConfigurationRefreshState());

        listener.onConfigurationChange(new ConfigurationChangeEvent("", 1L, "", 0, "UPDATE", Instant.now(), "api-management", "/api/gateway/routes"));

        verifyNoInteractions(client);
        verifyNoInteractions(registry);
    }
}
