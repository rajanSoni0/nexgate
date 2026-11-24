package in.rajan.nexgate.gateway.proxy;

import in.rajan.nexgate.gateway.dto.GatewayRouteConfiguration;
import in.rajan.nexgate.gateway.error.GatewayException;
import org.springframework.http.HttpStatus;

import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.ConnectException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import in.rajan.nexgate.gateway.security.AuthorizationResult;

public class HttpProxyForwarder {
    private final HttpClient httpClient;
    private final PathTransformer pathTransformer;
    private final HeaderTransformer headerTransformer;

    public HttpProxyForwarder(HttpClient httpClient, PathTransformer pathTransformer, HeaderTransformer headerTransformer) {
        this.httpClient = httpClient;
        this.pathTransformer = pathTransformer;
        this.headerTransformer = headerTransformer;
    }

    public ProxyResult forward(HttpServletRequest request, GatewayRouteConfiguration route,
                               String correlationHeader, String correlationId) {
        return forward(request, route, correlationHeader, correlationId,
                new AuthorizationResult(null, false));
    }

    public ProxyResult forward(HttpServletRequest request, GatewayRouteConfiguration route,
                               String correlationHeader, String correlationId,
                               AuthorizationResult authorization) {
        final URI target;
        try {
            target = pathTransformer.transform(route, request.getRequestURI(), request.getQueryString());
        } catch (IllegalArgumentException ex) {
            throw new GatewayException(HttpStatus.BAD_GATEWAY, "INVALID_TARGET_CONFIGURATION",
                    "The configured downstream target is invalid");
        }

        Map<String, List<String>> incoming = new HashMap<>();
        Collections.list(request.getHeaderNames()).forEach(name ->
                incoming.put(name, Collections.list(request.getHeaders(name))));
        boolean mayForwardAuthorization = authorization.authenticated()
                && authorization.principal() != null
                && !authorization.principal().roles().contains("GATEWAY_SERVICE")
                && !"gateway-service".equalsIgnoreCase(authorization.principal().identity());
        Map<String, List<String>> transformed = headerTransformer.transformRequest(
                incoming, route, correlationHeader, correlationId,
                mayForwardAuthorization, request.getHeader("Authorization"));

        byte[] body;
        try {
            Object cached = request.getAttribute("nexgate.requestBody");
            body = cached instanceof byte[] bytes ? bytes : request.getInputStream().readAllBytes();
        } catch (IOException ex) {
            throw new GatewayException(HttpStatus.BAD_GATEWAY, "FORWARDING_FAILURE",
                    "Unable to read the incoming request body");
        }

        HttpRequest.Builder builder = HttpRequest.newBuilder(target)
                .method(request.getMethod(), body.length == 0
                        ? HttpRequest.BodyPublishers.noBody()
                        : HttpRequest.BodyPublishers.ofByteArray(body))
                .timeout(Duration.ofMillis(route.policy().timeoutMs()));
        transformed.forEach((name, values) -> values.forEach(value -> builder.header(name, value)));

        try {
            HttpResponse<byte[]> response = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofByteArray());
            Map<String, List<String>> responseHeaders = headerTransformer.transformResponse(
                    response.headers().map(), route);
            return new ProxyResult(response.statusCode(), response.body(), responseHeaders);
        } catch (java.net.http.HttpTimeoutException ex) {
            throw new GatewayException(HttpStatus.GATEWAY_TIMEOUT, "DOWNSTREAM_TIMEOUT",
                    "The downstream target did not respond before the configured timeout");
        } catch (ConnectException ex) {
            throw new GatewayException(HttpStatus.BAD_GATEWAY, "TARGET_CONNECTION_FAILURE",
                    "Unable to connect to the downstream target");
        } catch (IOException ex) {
            throw new GatewayException(HttpStatus.BAD_GATEWAY, "TARGET_UNAVAILABLE",
                    "The downstream target communication failed");
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new GatewayException(HttpStatus.BAD_GATEWAY, "FORWARDING_FAILURE",
                    "The forwarding operation was interrupted");
        }
    }
}
