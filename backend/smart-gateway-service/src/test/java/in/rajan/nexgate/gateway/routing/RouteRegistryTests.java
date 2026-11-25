package in.rajan.nexgate.gateway.routing;

import in.rajan.nexgate.gateway.dto.GatewayRouteConfiguration;
import in.rajan.nexgate.gateway.dto.GatewayRoutePolicy;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.junit.jupiter.api.Assertions.*;

class RouteRegistryTests {
    private GatewayRouteConfiguration route(String id, String pattern, boolean active, boolean deleted, long version) {
        GatewayRoutePolicy policy = new GatewayRoutePolicy(true, Set.of("TENANT_ADMIN"), false, null, null, null, 5000, false, false, null);
        return new GatewayRouteConfiguration(1L, 1L, id, id, null, pattern, "https://example.test", true,
                Set.of("GET"), active, deleted, version, policy, List.of());
    }

    @Test
    void replacesRegistryAtomicallyAndExcludesInactiveRoutes() {
        RouteRegistry registry = new RouteRegistry();
        registry.replace(List.of(route("active", "/catalog/**", true, false, 1), route("inactive", "/orders/**", false, false, 1)));
        assertTrue(registry.find("GET", "catalog").isPresent());
        assertTrue(registry.find("GET", "/catalog/1").isPresent());
        assertFalse(registry.find("GET", "/orders/1").isPresent());

        registry.replace(List.of(route("replacement", "/new/**", true, false, 2)));
        assertFalse(registry.find("GET", "/catalog/1").isPresent());
        assertTrue(registry.find("GET", "/new/1").isPresent());
    }

    @Test
    void rejectsDuplicateRegistrations() {
        RouteRegistry registry = new RouteRegistry();
        assertThrows(IllegalArgumentException.class, () -> registry.replace(List.of(
                route("one", "/same/**", true, false, 1), route("two", "/same/**", true, false, 1))));
    }

    @Test
    void concurrentReadersSeeOnlyCompleteSnapshots() throws Exception {
        RouteRegistry registry = new RouteRegistry();
        registry.replace(List.of(route("one", "/one/**", true, false, 1)));
        AtomicBoolean failed = new AtomicBoolean();
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(8);
        for (int i = 0; i < 8; i++) {
            pool.submit(() -> {
                try {
                    start.await();
                    for (int j = 0; j < 5000; j++) {
                        if (!registry.snapshot().isEmpty() && registry.find("GET", "/one/1").isPresent() == registry.find("GET", "/two/1").isPresent()) {
                            failed.set(registry.snapshot().size() == 0);
                        }
                    }
                } catch (InterruptedException ex) { Thread.currentThread().interrupt(); }
            });
        }
        for (int i = 0; i < 50; i++) registry.replace(List.of(route("one", "/one/**", true, false, i), route("two", "/two/**", true, false, i)));
        start.countDown();
        pool.shutdown();
        assertFalse(failed.get());
    }
}
