package in.rajan.nexgate.gateway.routing;

import in.rajan.nexgate.gateway.dto.GatewayRouteConfiguration;
import in.rajan.nexgate.gateway.matching.RouteMatch;

import java.util.*;
import java.util.concurrent.atomic.AtomicReference;

public class RouteRegistry {
    private final AtomicReference<Map<String, GatewayRouteConfiguration>> routes;

    public RouteRegistry() {
        this.routes = new AtomicReference<>(Map.of());
    }

    public RouteRegistry replace(List<GatewayRouteConfiguration> configurations) {
        Map<String, GatewayRouteConfiguration> next = new HashMap<>();
        for (GatewayRouteConfiguration route : configurations) {
            if (route == null || !route.active() || route.deleted()) continue;
            for (String method : route.allowedMethods()) {
                String key = route.allowedMethods() == null ? "" : method.toUpperCase(Locale.ROOT) + " " + normalizePath(route.pathPattern());
                GatewayRouteConfiguration previous = next.putIfAbsent(key, route);
                if (previous != null) throw new IllegalArgumentException("Duplicate route registration: " + key);
            }
        }
        routes.set(Map.copyOf(next));
        return this;
    }

    public Optional<GatewayRouteConfiguration> find(String method, String path) {
        return findMatch(method, path).map(RouteMatch::route);
    }

    public Optional<RouteMatch> findMatch(String method, String path) {
        Map<String, GatewayRouteConfiguration> snapshot = routes.get();
        String normalizedMethod = method.toUpperCase(Locale.ROOT);
        String normalizedPath = normalizePath(path);

        GatewayRouteConfiguration exact = snapshot.get(normalizedMethod + " " + normalizedPath);
        if (exact != null) return Optional.of(new RouteMatch(exact, normalizedMethod, normalizedPath));

        List<MatchCandidate> candidates = new ArrayList<>();
        for (Map.Entry<String, GatewayRouteConfiguration> entry : snapshot.entrySet()) {
            if (!entry.getKey().startsWith(normalizedMethod + " ")) continue;
            String pattern = entry.getKey().substring(entry.getKey().indexOf(' ') + 1);
            if (pathMatches(pattern, normalizedPath)) candidates.add(new MatchCandidate(pattern, entry.getValue()));
        }
        if (candidates.isEmpty()) return Optional.empty();
        candidates.sort(Comparator
                .comparingInt(MatchCandidate::specificity).reversed()
                .thenComparing(candidate -> candidate.route().routeId(), Comparator.nullsLast(String::compareTo)));
        MatchCandidate selected = candidates.get(0);
        return Optional.of(new RouteMatch(selected.route(), normalizedMethod, normalizedPath));
    }

    public boolean findMatchForOtherMethod(String unsupportedMethod, String path) {
        Map<String, GatewayRouteConfiguration> snapshot = routes.get();
        String normalizedPath = normalizePath(path);
        for (Map.Entry<String, GatewayRouteConfiguration> entry : snapshot.entrySet()) {
            String pattern = entry.getKey().substring(entry.getKey().indexOf(' ') + 1);
            if (!entry.getKey().startsWith(unsupportedMethod.toUpperCase(Locale.ROOT) + " ")
                    && pathMatches(pattern, normalizedPath)) return true;
        }
        return false;
    }

    public int activeRouteCount() {
        Set<String> routeIds = new HashSet<>();
        routes.get().values().forEach(route -> routeIds.add(route.routeId()));
        return routeIds.size();
    }

    public Map<String, GatewayRouteConfiguration> snapshot() {
        return routes.get();
    }

    private String normalizePath(String path) {
        if (path == null || path.isBlank()) return "/";
        String normalized = path.startsWith("/") ? path : "/" + path;
        if (normalized.length() > 1 && normalized.endsWith("/")) normalized = normalized.substring(0, normalized.length() - 1);
        return normalized;
    }

    private boolean pathMatches(String pattern, String path) {
        String normalizedPattern = normalizePath(pattern);
        if (normalizedPattern.endsWith("/**")) {
            String prefix = normalizedPattern.substring(0, normalizedPattern.length() - 3);
            return prefix.isEmpty() || path.equals(prefix) || path.startsWith(prefix + "/");
        }
        if (normalizedPattern.endsWith("/*")) {
            String prefix = normalizedPattern.substring(0, normalizedPattern.length() - 2);
            return path.startsWith(prefix + "/") && path.substring(prefix.length() + 1).indexOf('/') < 0;
        }
        if (normalizedPattern.indexOf('{') >= 0) {
            String regex = normalizedPattern.replace(".", "\\.").replaceAll("\\{[^/]+\\}", "[^/]+");
            return path.matches(regex);
        }
        return normalizedPattern.equals(path);
    }

    private record MatchCandidate(String pattern, GatewayRouteConfiguration route) {
        private int specificity() {
            if (pattern.indexOf('*') < 0 && pattern.indexOf('{') < 0 && pattern.indexOf('/') >= 0) return 1000 + pattern.length();
            if (pattern.indexOf('{') >= 0) return 700 + pattern.length();
            if (pattern.endsWith("/*")) return 500 + pattern.length();
            if (pattern.endsWith("/**")) return 100 + pattern.length();
            return pattern.length();
        }
    }
}
