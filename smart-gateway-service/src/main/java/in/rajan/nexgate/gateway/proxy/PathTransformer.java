package in.rajan.nexgate.gateway.proxy;

import in.rajan.nexgate.gateway.dto.GatewayRouteConfiguration;

import java.net.URI;
import java.net.URISyntaxException;

public class PathTransformer {

    public URI transform(GatewayRouteConfiguration route, String incomingPath, String rawQuery) {
        String rewritten = rewrite(route, incomingPath);
        String targetUri = route.targetUri();
        try {
            URI target = URI.create(targetUri);
            String targetBasePath = normalize(target.getRawPath());
            String joined = join(targetBasePath, rewritten);
            String fragmentFreeQuery = rawQuery == null || rawQuery.isBlank() ? null : rawQuery;
            return new URI(target.getScheme(), target.getRawUserInfo(), target.getHost(), target.getPort(), joined,
                    fragmentFreeQuery, null);
        } catch (URISyntaxException | RuntimeException ex) {
            throw new IllegalArgumentException("Invalid target URI or rewritten path", ex);
        }
    }

    String rewrite(GatewayRouteConfiguration route, String incomingPath) {
        String path = normalize(incomingPath);
        String pattern = normalize(route.pathPattern());

        if (route.policy().rewriteEnabled()) {
            String replacement = normalize(route.policy().rewriteTargetPrefix());
            String remainder = remainder(pattern, path);
            return remainder.isEmpty() ? replacement : join(replacement, remainder);
        }

        if (route.stripPrefix()) {
            String remainder = remainder(pattern, path);
            return remainder.isEmpty() ? "/" : remainder;
        }
        return path;
    }

    private String remainder(String pattern, String path) {
        if (pattern.endsWith("/**") || pattern.endsWith("/*")) {
            String prefix = pattern.substring(0, pattern.length() - (pattern.endsWith("/**") ? 3 : 2));
            if (path.equals(prefix)) return "";
            if (path.startsWith(prefix + "/")) return path.substring(prefix.length());
        }
        if (pattern.indexOf('{') >= 0) {
            String[] patternSegments = pattern.split("/");
            String[] pathSegments = path.split("/");
            if (patternSegments.length == pathSegments.length) return "";
        }
        if (path.startsWith(pattern)) return path.substring(pattern.length());
        return path;
    }

    private String normalize(String path) {
        if (path == null || path.isBlank()) return "/";
        String value = path.startsWith("/") ? path : "/" + path;
        if (value.length() > 1 && value.endsWith("/")) value = value.substring(0, value.length() - 1);
        return value;
    }

    private String join(String left, String right) {
        if (left == null || left.isBlank() || "/".equals(left)) left = "";
        if (right == null || right.isBlank() || "/".equals(right)) right = "";
        if (left.isEmpty()) return right.startsWith("/") ? right : "/" + right;
        if (right.isEmpty()) return left.startsWith("/") ? left : "/" + left;
        return left.endsWith("/") ? left + right.replaceFirst("^/", "") : left + (right.startsWith("/") ? right : "/" + right);
    }
}
