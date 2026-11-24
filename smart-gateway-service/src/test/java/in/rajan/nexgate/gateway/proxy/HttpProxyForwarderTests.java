package in.rajan.nexgate.gateway.proxy;

import com.sun.net.httpserver.HttpServer;
import in.rajan.nexgate.gateway.dto.GatewayRouteConfiguration;
import in.rajan.nexgate.gateway.dto.GatewayRoutePolicy;
import in.rajan.nexgate.gateway.error.GatewayException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import java.net.InetSocketAddress;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class HttpProxyForwarderTests {
    private GatewayRouteConfiguration route(String target, int timeout) {
        GatewayRoutePolicy policy = new GatewayRoutePolicy(false, Set.of(), false, null, null, null, timeout, false, false, null);
        return new GatewayRouteConfiguration(1L, 1L, "test", "Test", null, "/test/**", target, true,
                Set.of("GET", "POST", "PUT", "PATCH", "DELETE"), true, false, 1, policy, List.of());
    }

    @Test
    void forwardsPostBodyQueryAndPreservesDownstreamResponse() throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/echo", exchange -> {
            byte[] body = exchange.getRequestBody().readAllBytes();
            exchange.getResponseHeaders().add("X-Downstream", "present");
            String response = exchange.getRequestMethod() + " " + exchange.getRequestURI() + " " + new String(body, StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(201, response.getBytes().length);
            exchange.getResponseBody().write(response.getBytes());
            exchange.close();
        });
        server.start();

        try {
            String target = "http://127.0.0.1:" + server.getAddress().getPort();
            MockHttpServletRequest request = new MockHttpServletRequest("POST", "/test/echo");
            request.setQueryString("page=2");
            request.setContent("{\"x\":1}".getBytes(StandardCharsets.UTF_8));
            HttpProxyForwarder forwarder = forwarder();
            ProxyResult result = forwarder.forward(request, route(target, 2000), "X-Correlation-ID", "corr-123");
            assertEquals(201, result.status());
            assertTrue(new String(result.body(), StandardCharsets.UTF_8).contains("POST /echo?page=2"));
            assertEquals("present", result.headers().entrySet().stream()
                    .filter(entry -> entry.getKey().equalsIgnoreCase("X-Downstream"))
                    .findFirst().orElseThrow().getValue().get(0));
        } finally {
            server.stop(0);
        }
    }

    @Test
    void returnsDownstream4xxAnd5xxAsIs() throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/bad", exchange -> {
            byte[] body = "downstream bad request".getBytes();
            exchange.sendResponseHeaders(400, body.length);
            exchange.getResponseBody().write(body); exchange.close();
        });
        server.createContext("/fail", exchange -> {
            byte[] body = "downstream failure".getBytes();
            exchange.sendResponseHeaders(503, body.length);
            exchange.getResponseBody().write(body); exchange.close();
        });
        server.start();

        try {
            String target = "http://127.0.0.1:" + server.getAddress().getPort();
            HttpProxyForwarder forwarder = forwarder();
            ProxyResult bad = forwarder.forward(new MockHttpServletRequest("GET", "/test/bad"), route(target, 2000), "X-Correlation-ID", "corr");
            ProxyResult fail = forwarder.forward(new MockHttpServletRequest("GET", "/test/fail"), route(target, 2000), "X-Correlation-ID", "corr");
            assertEquals(400, bad.status());
            assertEquals(503, fail.status());
        } finally { server.stop(0); }
    }

    @Test
    void timeoutAndConnectionFailureBecomeGatewayExceptions() {
        GatewayRouteConfiguration timeoutRoute = route("http://127.0.0.1:1", 50);
        HttpProxyForwarder forwarder = forwarder();
        GatewayException connection = assertThrows(GatewayException.class, () ->
                forwarder.forward(new MockHttpServletRequest("GET", "/test/x"), timeoutRoute, "X-Correlation-ID", "corr"));
        assertEquals(org.springframework.http.HttpStatus.BAD_GATEWAY, connection.status());
    }

    private HttpProxyForwarder forwarder() {
        return new HttpProxyForwarder(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(1)).build(),
                new PathTransformer(), new HeaderTransformer());
    }
}
