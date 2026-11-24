package in.rajan.nexgate.gateway.configuration;

import in.rajan.nexgate.gateway.dto.GatewayRouteConfiguration;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

class RouteStartupLoaderTests {
    @Test
    void managementFailureFailsStartup() {
        ManagementRouteClient client = mock(ManagementRouteClient.class);
        RouteRegistryService registry = mock(RouteRegistryService.class);
        when(client.fetchActiveRoutes()).thenThrow(new IllegalStateException("management unavailable"));

        RouteStartupLoader loader = new RouteStartupLoader(client, registry);

        assertThrows(IllegalStateException.class, () -> loader.run(null));
    }

    @Test
    void emptyStartupConfigurationIsAllowed() {
        ManagementRouteClient client = mock(ManagementRouteClient.class);
        RouteRegistryService registry = mock(RouteRegistryService.class);
        when(client.fetchActiveRoutes()).thenReturn(List.<GatewayRouteConfiguration>of());

        RouteStartupLoader loader = new RouteStartupLoader(client, registry);

        when(registry.replace(List.of())).thenReturn(true);
        assertDoesNotThrow(() -> loader.run(null));
    }
}
