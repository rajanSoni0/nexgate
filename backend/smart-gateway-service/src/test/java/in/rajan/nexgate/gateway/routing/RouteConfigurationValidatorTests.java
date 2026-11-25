package in.rajan.nexgate.gateway.routing;

import in.rajan.nexgate.gateway.dto.GatewayRouteConfiguration;
import in.rajan.nexgate.gateway.dto.GatewayRoutePolicy;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class RouteConfigurationValidatorTests {
    private final RouteConfigurationValidator validator = new RouteConfigurationValidator();

    @Test
    void rejectsInvalidTargetAndPolicy() {
        GatewayRoutePolicy badPolicy = new GatewayRoutePolicy(false, Set.of(), false, null, null, null, 0, false, false, null);
        GatewayRouteConfiguration bad = new GatewayRouteConfiguration(1L, 1L, "bad", "Bad", null, "bad", "ftp://bad", true,
                Set.of("GET"), true, false, 1, badPolicy, List.of());
        assertThrows(IllegalArgumentException.class, () -> validator.validate(bad));
    }

    @Test
    void acceptsValidConfiguration() {
        GatewayRoutePolicy policy = new GatewayRoutePolicy(true, Set.of("TENANT_ADMIN"), true, 100, 60, "ROUTE", 5000, false, false, null);
        GatewayRouteConfiguration route = new GatewayRouteConfiguration(1L, 1L, "catalog", "Catalog", null, "/catalog/**", "https://catalog:8082", true,
                Set.of("GET"), true, false, 1, policy, List.of());
        assertDoesNotThrow(() -> validator.validate(route));
    }
}
