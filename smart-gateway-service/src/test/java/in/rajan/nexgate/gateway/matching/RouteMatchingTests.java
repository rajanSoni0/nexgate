package in.rajan.nexgate.gateway.matching;

import in.rajan.nexgate.gateway.dto.GatewayRouteConfiguration;
import in.rajan.nexgate.gateway.dto.GatewayRoutePolicy;
import in.rajan.nexgate.gateway.routing.RouteRegistry;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import static org.junit.jupiter.api.Assertions.*;

class RouteMatchingTests {
    private GatewayRouteConfiguration route(String id, String pattern, Set<String> methods, boolean active) {
        GatewayRoutePolicy policy = new GatewayRoutePolicy(false, Set.of(), false, null, null, null, 5000, false, false, null);
        return new GatewayRouteConfiguration(1L, 1L, id, id, null, pattern, "https://example.test", true,
                methods, active, false, 1, policy, List.of());
    }

    @Test
    void exactParameterizedWildcardAndTrailingSlashMatching() {
        RouteRegistry registry = new RouteRegistry();
        registry.replace(List.of(
                route("exact", "/catalog/items", Set.of("GET"), true),
                route("parameter", "/catalog/{id}", Set.of("GET"), true),
                route("wildcard-one", "/catalog/*", Set.of("GET"), true),
                route("wildcard-many", "/catalog/**", Set.of("GET"), true)));

        assertEquals("exact", registry.find("GET", "/catalog/items/").orElseThrow().routeId());
        assertEquals("parameter", registry.find("GET", "/catalog/123").orElseThrow().routeId());
        assertEquals("parameter", registry.find("GET", "/catalog/a").orElseThrow().routeId());
        assertEquals("wildcard-many", registry.find("GET", "/catalog/a/b").orElseThrow().routeId());
    }

    @Test
    void methodAcceptanceAndRejectionAreSeparate() {
        RouteRegistry registry = new RouteRegistry();
        registry.replace(List.of(route("catalog", "/catalog/**", Set.of("GET", "POST"), true)));
        assertTrue(registry.find("GET", "/catalog/1").isPresent());
        assertFalse(registry.find("DELETE", "/catalog/1").isPresent());
        assertTrue(registry.findMatchForOtherMethod("DELETE", "/catalog/1"));
    }

    @Test
    void inactiveAndUnknownRoutesDoNotMatch() {
        RouteRegistry registry = new RouteRegistry();
        registry.replace(List.of(route("inactive", "/inactive/**", Set.of("GET"), false)));
        assertTrue(registry.find("GET", "/inactive/1").isEmpty());
        assertTrue(registry.find("GET", "/unknown").isEmpty());
    }

    @Test
    void concurrentRefreshNeverExposesPartialRegistry() throws Exception {
        RouteRegistry registry = new RouteRegistry();
        registry.replace(List.of(route("old", "/old/**", Set.of("GET"), true)));
        ExecutorService pool = Executors.newFixedThreadPool(8);
        AtomicBoolean inconsistent = new AtomicBoolean(false);
        for (int i = 0; i < 8; i++) {
            pool.submit(() -> {
                for (int j = 0; j < 1000; j++) {
                    var snapshot = registry.snapshot();
                    if (snapshot.values().stream().anyMatch(r -> r.routeId().equals("old"))
                            && snapshot.values().stream().anyMatch(r -> r.routeId().equals("new"))) inconsistent.set(true);
                    registry.find("GET", "/old/1");
                    registry.find("GET", "/new/1");
                }
            });
        }
        registry.replace(List.of(route("new", "/new/**", Set.of("GET"), true)));
        pool.shutdown();
        pool.awaitTermination(5, java.util.concurrent.TimeUnit.SECONDS);
        assertFalse(inconsistent.get());
        assertTrue(registry.find("GET", "/new/1").isPresent());
        assertTrue(registry.find("GET", "/old/1").isEmpty());
    }
}
