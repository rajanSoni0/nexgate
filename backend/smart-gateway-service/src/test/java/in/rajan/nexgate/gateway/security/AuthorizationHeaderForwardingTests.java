package in.rajan.nexgate.gateway.security;

import in.rajan.nexgate.gateway.dto.GatewayHeaderRule;
import in.rajan.nexgate.gateway.dto.GatewayRouteConfiguration;
import in.rajan.nexgate.gateway.dto.GatewayRoutePolicy;
import in.rajan.nexgate.gateway.proxy.HeaderTransformer;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class AuthorizationHeaderForwardingTests {
    @Test
    void authorizationIsStrippedByDefault() {
        GatewayRouteConfiguration route = route(List.of());
        Map<String, List<String>> result = new HeaderTransformer().transformRequest(headers(), route,
                "X-Correlation-ID", "corr", false, null);
        assertFalse(result.containsKey("Authorization"));
    }

    @Test
    void authorizationForwardingRequiresExplicitRuleAndAuthentication() {
        GatewayHeaderRule forward = new GatewayHeaderRule("REQUEST", "FORWARD", "Authorization", null);
        GatewayRouteConfiguration route = route(List.of(forward));
        HeaderTransformer transformer = new HeaderTransformer();

        Map<String, List<String>> unauthenticated = transformer.transformRequest(headers(), route,
                "X-Correlation-ID", "corr", false, "Bearer client-token");
        assertFalse(unauthenticated.containsKey("Authorization"));

        Map<String, List<String>> authenticated = transformer.transformRequest(headers(), route,
                "X-Correlation-ID", "corr", true, "Bearer client-token");
        assertEquals(List.of("Bearer client-token"), authenticated.get("Authorization"));
    }

    private GatewayRouteConfiguration route(List<GatewayHeaderRule> rules) {
        GatewayRoutePolicy policy = new GatewayRoutePolicy(true, Set.of("TENANT_ADMIN"), false, null, null, null, 5000, false, false, null);
        return new GatewayRouteConfiguration(1L, 1L, "r", "R", null, "/r/**", "http://target.test", true,
                Set.of("GET"), true, false, 1, policy, rules);
    }

    private Map<String, List<String>> headers() {
        Map<String, List<String>> headers = new LinkedHashMap<>();
        headers.put("Authorization", List.of("Bearer client-token"));
        return headers;
    }
}
