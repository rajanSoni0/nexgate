package in.rajan.nexgate.gateway.configuration;

import in.rajan.nexgate.gateway.dto.GatewayRouteConfiguration;
import in.rajan.nexgate.gateway.dto.GatewayRoutePolicy;
import in.rajan.nexgate.gateway.routing.RouteConfigurationValidator;
import in.rajan.nexgate.gateway.routing.RouteRegistry;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class RouteRegistryServiceTests {
    private GatewayRouteConfiguration route(String id, String pattern, boolean active, long version) {
        GatewayRoutePolicy policy = new GatewayRoutePolicy(false, Set.of(), false, null, null, null, 5000, false, false, null);
        return new GatewayRouteConfiguration(1L, 1L, id, id, null, pattern, "https://example.test", true,
                Set.of("GET"), active, false, version, policy, List.of());
    }

    @Test
    void invalidRefreshRetainsPreviousRegistry() {
        RouteRegistry registry = new RouteRegistry();
        ConfigurationRefreshState state = new ConfigurationRefreshState();
        RouteRegistryService service = new RouteRegistryService(registry, new RouteConfigurationValidator(), state);

        assertTrue(service.replace(List.of(route("old", "/old/**", true, 1))));
        assertTrue(registry.find("GET", "/old/1").isPresent());

        assertFalse(service.replace(List.of(new GatewayRouteConfiguration(2L, 1L, "bad", "Bad", null, "invalid", "not-a-uri", true,
                Set.of("GET"), true, false, 2,
                new GatewayRoutePolicy(false, Set.of(), false, null, null, null, 5000, false, false, null), List.of()))));
        assertTrue(registry.find("GET", "/old/1").isPresent());
        assertEquals("DEGRADED", state.snapshot().status());
    }

    @Test
    void emptyConfigurationIsSupportedOnlyAsAnAtomicRuntimeRefresh() {
        RouteRegistry registry = new RouteRegistry();
        RouteRegistryService service = new RouteRegistryService(registry, new RouteConfigurationValidator(), new ConfigurationRefreshState());
        assertTrue(service.replace(List.of()));
        assertEquals(0, registry.activeRouteCount());
    }
}
