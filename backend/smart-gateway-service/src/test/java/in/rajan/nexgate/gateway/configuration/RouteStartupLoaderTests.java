package in.rajan.nexgate.gateway.configuration;

import in.rajan.nexgate.gateway.dto.GatewayRouteConfiguration;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

class RouteStartupLoaderTests {
    private static RouteStartupLoader loader(ManagementRouteClient client, RouteRegistryService registry) {
        return new RouteStartupLoader(client, registry, 3, 0);
    }

    @Test
    void managementFailureFailsStartupAfterMaxAttempts() {
        ManagementRouteClient client = mock(ManagementRouteClient.class);
        RouteRegistryService registry = mock(RouteRegistryService.class);
        when(client.fetchActiveRoutes()).thenThrow(new IllegalStateException("management unavailable"));

        assertThrows(IllegalStateException.class, () -> loader(client, registry).run(null));
        verify(client, times(3)).fetchActiveRoutes();
        verifyNoInteractions(registry);
    }

    @Test
    void transientManagementFailureIsRetriedUntilAvailable() {
        ManagementRouteClient client = mock(ManagementRouteClient.class);
        RouteRegistryService registry = mock(RouteRegistryService.class);
        when(client.fetchActiveRoutes())
                .thenThrow(new IllegalStateException("connection refused"))
                .thenThrow(new IllegalStateException("connection refused"))
                .thenReturn(List.<GatewayRouteConfiguration>of());
        when(registry.replace(List.of())).thenReturn(true);

        assertDoesNotThrow(() -> loader(client, registry).run(null));
        verify(client, times(3)).fetchActiveRoutes();
    }

    @Test
    void invalidConfigurationFailsWithoutRetry() {
        ManagementRouteClient client = mock(ManagementRouteClient.class);
        RouteRegistryService registry = mock(RouteRegistryService.class);
        when(client.fetchActiveRoutes()).thenReturn(List.<GatewayRouteConfiguration>of());
        when(registry.replace(List.of())).thenReturn(false);

        assertThrows(IllegalStateException.class, () -> loader(client, registry).run(null));
        verify(client, times(1)).fetchActiveRoutes();
    }

    @Test
    void emptyStartupConfigurationIsAllowed() {
        ManagementRouteClient client = mock(ManagementRouteClient.class);
        RouteRegistryService registry = mock(RouteRegistryService.class);
        when(client.fetchActiveRoutes()).thenReturn(List.<GatewayRouteConfiguration>of());
        when(registry.replace(List.of())).thenReturn(true);

        assertDoesNotThrow(() -> loader(client, registry).run(null));
    }
}
