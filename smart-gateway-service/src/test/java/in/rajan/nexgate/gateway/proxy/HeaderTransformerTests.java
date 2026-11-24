package in.rajan.nexgate.gateway.proxy;

import in.rajan.nexgate.gateway.dto.GatewayHeaderRule;
import in.rajan.nexgate.gateway.dto.GatewayRouteConfiguration;
import in.rajan.nexgate.gateway.dto.GatewayRoutePolicy;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class HeaderTransformerTests {
    @Test
    void addsModifiesRemovesAndPropagatesCorrelationId() {
        GatewayHeaderRule add = new GatewayHeaderRule("REQUEST", "ADD", "X-Added", "yes");
        GatewayHeaderRule modify = new GatewayHeaderRule("REQUEST", "MODIFY", "X-Test", "new");
        GatewayHeaderRule remove = new GatewayHeaderRule("REQUEST", "REMOVE", "X-Remove", null);
        GatewayRoutePolicy policy = new GatewayRoutePolicy(false, Set.of(), false, null, null, null, 5000, false, false, null);
        GatewayRouteConfiguration route = new GatewayRouteConfiguration(1L, 1L, "r", "R", null, "/r/**", "http://target.test", true,
                Set.of("GET"), true, false, 1, policy, List.of(add, modify, remove));
        Map<String, List<String>> incoming = new LinkedHashMap<>();
        incoming.put("Host", List.of("gateway.test"));
        incoming.put("Authorization", List.of("Bearer secret"));
        incoming.put("Connection", List.of("close"));
        incoming.put("X-Test", List.of("old"));
        incoming.put("X-Remove", List.of("secret"));

        Map<String, List<String>> transformed = new HeaderTransformer().transformRequest(incoming, route,
                "X-Correlation-ID", "corr-123");

        assertFalse(transformed.containsKey("Host"));
        assertFalse(transformed.containsKey("Authorization"));
        assertFalse(transformed.containsKey("Connection"));
        assertEquals(List.of("yes"), transformed.get("X-Added"));
        assertEquals(List.of("new"), transformed.get("X-Test"));
        assertFalse(transformed.containsKey("X-Remove"));
        assertEquals(List.of("corr-123"), transformed.get("X-Correlation-ID"));
    }
}
