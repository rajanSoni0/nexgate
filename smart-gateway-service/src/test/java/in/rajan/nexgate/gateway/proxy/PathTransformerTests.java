package in.rajan.nexgate.gateway.proxy;

import in.rajan.nexgate.gateway.dto.GatewayRouteConfiguration;
import in.rajan.nexgate.gateway.dto.GatewayRoutePolicy;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;

class PathTransformerTests {
    private GatewayRouteConfiguration route(boolean rewrite, String rewritePrefix, boolean strip) {
        GatewayRoutePolicy policy = new GatewayRoutePolicy(false, Set.of(), false, null, null, null, 5000,
                false, rewrite, rewritePrefix);
        return new GatewayRouteConfiguration(1L, 1L, "catalog", "Catalog", null, "/catalog/**", "http://target.test/base", strip,
                Set.of("GET", "POST"), true, false, 1, policy, List.of());
    }

    @Test
    void stripsPrefixAndPreservesQuery() {
        var transformer = new PathTransformer();
        var uri = transformer.transform(route(false, null, true), "/catalog/items/1", "page=2&sort=name");
        assertEquals("/base/items/1", uri.getRawPath());
        assertEquals("page=2&sort=name", uri.getRawQuery());
    }

    @Test
    void rewritesToConfiguredPrefixAndAvoidsDoubleSlashes() {
        var transformer = new PathTransformer();
        var uri = transformer.transform(route(true, "/products", false), "/catalog/items", null);
        assertEquals("/base/products/items", uri.getRawPath());
    }

    @Test
    void rewriteRootIsHandledCleanly() {
        var transformer = new PathTransformer();
        var uri = transformer.transform(route(true, "/", true), "/catalog", null);
        assertEquals("/base", uri.getRawPath());
    }
}
