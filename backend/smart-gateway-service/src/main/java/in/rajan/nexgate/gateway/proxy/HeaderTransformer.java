package in.rajan.nexgate.gateway.proxy;

import in.rajan.nexgate.gateway.dto.GatewayHeaderRule;
import in.rajan.nexgate.gateway.dto.GatewayRouteConfiguration;

import java.util.*;

public class HeaderTransformer {
    private static final Set<String> HOP_BY_HOP = Set.of(
            "connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailer",
            "transfer-encoding", "upgrade");

    public Map<String, List<String>> transformRequest(Map<String, List<String>> incoming,
                                                      GatewayRouteConfiguration route,
                                                      String correlationHeader,
                                                      String correlationId) {
        return transformRequest(incoming, route, correlationHeader, correlationId, false, null);
    }

    public Map<String, List<String>> transformRequest(Map<String, List<String>> incoming,
                                                      GatewayRouteConfiguration route,
                                                      String correlationHeader,
                                                      String correlationId,
                                                      boolean authenticated,
                                                      String originalAuthorization) {
        Map<String, List<String>> result = new HashMap<>();
        incoming.forEach((name, values) -> {
            if (name == null || HOP_BY_HOP.contains(name.toLowerCase(Locale.ROOT))
                    || name.equalsIgnoreCase("host") || name.equalsIgnoreCase("content-length")
                    || name.equalsIgnoreCase("authorization") || name.equalsIgnoreCase("cookie")) return;
            result.put(name, values == null ? List.of() : List.copyOf(values));
        });
        if (route.headerRules() != null) {
            for (GatewayHeaderRule rule : route.headerRules()) {
                if (!"REQUEST".equalsIgnoreCase(rule.direction())) continue;
                String name = rule.headerName();
                if (name == null || HOP_BY_HOP.contains(name.toLowerCase(Locale.ROOT))) continue;
                switch (rule.action().toUpperCase(Locale.ROOT)) {
                    case "ADD" -> result.putIfAbsent(name, List.of(rule.headerValue()));
                    case "MODIFY" -> result.put(name, List.of(rule.headerValue()));
                    case "REMOVE" -> result.remove(name);
                    case "FORWARD" -> {
                        if (authenticated && "authorization".equalsIgnoreCase(name)
                                && originalAuthorization != null && !originalAuthorization.isBlank()) {
                            result.put(name, List.of(originalAuthorization));
                        }
                    }
                }
            }
        }
        result.put(correlationHeader, List.of(correlationId));
        return result;
    }

    public Map<String, List<String>> transformResponse(Map<String, List<String>> incoming,
                                                       GatewayRouteConfiguration route) {
        Map<String, List<String>> result = new LinkedHashMap<>();
        incoming.forEach((name, values) -> {
            if (name != null && !HOP_BY_HOP.contains(name.toLowerCase(Locale.ROOT))
                    && !name.equalsIgnoreCase("content-length")) {
                result.put(name, values == null ? List.of() : List.copyOf(values));
            }
        });
        if (route.headerRules() != null) {
            for (GatewayHeaderRule rule : route.headerRules()) {
                if (!"RESPONSE".equalsIgnoreCase(rule.direction())) continue;
                switch (rule.action().toUpperCase(Locale.ROOT)) {
                    case "ADD" -> result.putIfAbsent(rule.headerName(), List.of(rule.headerValue()));
                    case "MODIFY" -> result.put(rule.headerName(), List.of(rule.headerValue()));
                    case "REMOVE" -> result.remove(rule.headerName());
                    case "FORWARD" -> { }
                }
            }
        }
        return result;
    }
}
