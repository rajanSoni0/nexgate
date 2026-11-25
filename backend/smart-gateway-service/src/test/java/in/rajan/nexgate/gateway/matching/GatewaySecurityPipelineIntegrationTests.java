package in.rajan.nexgate.gateway.matching;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.sun.net.httpserver.HttpServer;
import in.rajan.nexgate.gateway.correlation.CorrelationIdFilter;
import in.rajan.nexgate.gateway.correlation.CorrelationProperties;
import in.rajan.nexgate.gateway.dto.GatewayHeaderRule;
import in.rajan.nexgate.gateway.dto.GatewayRouteConfiguration;
import in.rajan.nexgate.gateway.dto.GatewayRoutePolicy;
import in.rajan.nexgate.gateway.error.GatewayExceptionHandler;
import in.rajan.nexgate.gateway.proxy.HeaderTransformer;
import in.rajan.nexgate.gateway.proxy.HttpProxyForwarder;
import in.rajan.nexgate.gateway.proxy.PathTransformer;
import in.rajan.nexgate.gateway.routing.RouteRegistry;
import in.rajan.nexgate.gateway.security.GatewayJwtProperties;
import in.rajan.nexgate.gateway.security.GatewayJwtValidator;
import in.rajan.nexgate.gateway.security.RouteAuthorizationService;
import in.rajan.nexgate.gateway.policy.RedisRateLimiter;
import in.rajan.nexgate.gateway.policy.RouteRateLimitService;
import in.rajan.nexgate.gateway.policy.RedisIdempotencyService;
import in.rajan.nexgate.gateway.access.GatewayAccessPublisher;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.net.InetSocketAddress;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Date;
import java.util.List;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class GatewaySecurityPipelineIntegrationTests {
    private static final String SECRET = "test-signing-secret-that-is-at-least-32-bytes";
    private HttpServer server;
    private MockMvc mvc;
    private AtomicInteger downstreamCalls;

    @BeforeEach
    void setUp() throws Exception {
        downstreamCalls = new AtomicInteger();
        server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/public", exchange -> {
            downstreamCalls.incrementAndGet();
            exchange.getResponseHeaders().add("X-Downstream", "ok");
            byte[] body = ("downstream:" + exchange.getRequestURI()).getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        server.createContext("/", exchange -> {
            downstreamCalls.incrementAndGet();
            String authorization = exchange.getRequestHeaders().getFirst("Authorization");
            byte[] body = ((authorization == null ? "downstream:" : "authorization:" + authorization)
                    + exchange.getRequestURI()).getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        server.createContext("/public-forward", exchange -> {
            downstreamCalls.incrementAndGet();
            String authorization = exchange.getRequestHeaders().getFirst("Authorization");
            byte[] body = (authorization == null ? "missing" : authorization).getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        server.start();
        String target = "http://127.0.0.1:" + server.getAddress().getPort();

        RouteRegistry registry = new RouteRegistry();
        registry.replace(List.of(
                route("public", "/public/ok", false, Set.of(), target, List.of()),
                route("protected", "/protected/ok", true, Set.of("TENANT_ADMIN"), target, List.of()),
                route("public-forward", "/public-forward/forward", false, Set.of(), target,
                        List.of(new GatewayHeaderRule("REQUEST", "FORWARD", "Authorization", null))),
                route("public-no-forward", "/public-no-forward/ok", false, Set.of(), target, List.of()),
                route("public-forward-ok", "/public-forward/ok", false, Set.of(), target,
                        List.of(new GatewayHeaderRule("REQUEST", "FORWARD", "Authorization", null)))));

        GatewayJwtValidator validator = new GatewayJwtValidator(
                new GatewayJwtProperties(SECRET, "gatekeeper-api-management"));
        RouteAuthorizationService authorization = new RouteAuthorizationService(validator);
        HttpProxyForwarder forwarder = new HttpProxyForwarder(
                HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).build(),
                new PathTransformer(), new HeaderTransformer());
        RouteRateLimitService rateLimit = new RouteRateLimitService(org.mockito.Mockito.mock(RedisRateLimiter.class));
        RedisIdempotencyService idempotency = org.mockito.Mockito.mock(RedisIdempotencyService.class);
        GatewayAccessPublisher accessPublisher = org.mockito.Mockito.mock(GatewayAccessPublisher.class);
        GatewayRouteController controller = new GatewayRouteController(registry, forwarder, authorization,
                rateLimit, idempotency, accessPublisher, "X-Correlation-ID");

        mvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GatewayExceptionHandler(org.mockito.Mockito.mock(GatewayAccessPublisher.class)))
                .addFilters(new CorrelationIdFilter(new CorrelationProperties("X-Correlation-ID", 128)))
                .build();
    }

    @AfterEach
    void tearDown() {
        if (server != null) server.stop(0);
    }

    @Test
    void publicRouteWithoutJwtReachesDownstreamAndPreservesCorrelation() throws Exception {
        mvc.perform(get("/public/ok").header("X-Correlation-ID", "public-corr"))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Correlation-ID", "public-corr"))
                .andExpect(content().string(org.hamcrest.Matchers.startsWith("downstream:")));
        assertEquals(1, downstreamCalls.get());
    }

    @Test
    void protectedRouteWithoutJwtReturns401WithoutDownstream() throws Exception {
        mvc.perform(get("/protected/ok").header("X-Correlation-ID", "missing-corr"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("MISSING_JWT"))
                .andExpect(header().string("X-Correlation-ID", "missing-corr"));
        assertEquals(0, downstreamCalls.get());
    }

    @Test
    void protectedRouteWithInvalidJwtReturns401WithoutDownstream() throws Exception {
        mvc.perform(get("/protected/ok").header("Authorization", "Bearer malformed")
                        .header("X-Correlation-ID", "invalid-corr"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("X-Correlation-ID", "invalid-corr"));
        assertEquals(0, downstreamCalls.get());
    }

    @Test
    void protectedRouteWithInsufficientRoleReturns403WithoutDownstream() throws Exception {
        String token = sign("user", "USER", 60_000);
        mvc.perform(get("/protected/ok").header("Authorization", "Bearer " + token)
                        .header("X-Correlation-ID", "denied-corr"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("INSUFFICIENT_ROLE"));
        assertEquals(0, downstreamCalls.get());
    }

    @Test
    void protectedRouteWithAuthorizedJwtReachesDownstream() throws Exception {
        String token = sign("tenant-user", "TENANT_ADMIN", 60_000);
        mvc.perform(get("/protected/ok").header("Authorization", "Bearer " + token)
                        .header("X-Correlation-ID", "allowed-corr"))
                .andExpect(status().isOk())
                .andExpect(content().string(org.hamcrest.Matchers.startsWith("downstream:")));
        assertEquals(1, downstreamCalls.get());
    }

    @Test
    void publicRouteValidJwtAndExplicitForwardRuleForwardsCredential() throws Exception {
        String token = sign("tenant-user", "TENANT_ADMIN", 60_000);
        mvc.perform(get("/public-forward/forward").header("Authorization", "Bearer " + token)
                        .header("X-Correlation-ID", "forward-corr"))
                .andExpect(status().isOk())
                .andExpect(content().string(org.hamcrest.Matchers.containsString(token)));
    }

    @Test
    void publicRouteInvalidJwtAndInternalCredentialsNeverReachDownstream() throws Exception {
        mvc.perform(get("/public/ok").header("Authorization", "Bearer malformed")
                        .header("X-Correlation-ID", "invalid-public-corr"))
                .andExpect(status().isUnauthorized());
        assertEquals(0, downstreamCalls.get());

        String gatewayToken = sign("gateway-service", "GATEWAY_SERVICE", 60_000);
        mvc.perform(get("/public-forward/ok").header("Authorization", "Bearer " + gatewayToken)
                        .header("X-Correlation-ID", "internal-corr"))
                .andExpect(status().isOk())
                .andExpect(content().string(org.hamcrest.Matchers.startsWith("downstream:")));
    }

    private GatewayRouteConfiguration route(String id, String pattern, boolean protectedRoute,
                                             Set<String> roles, String target,
                                             List<GatewayHeaderRule> headers) {
        GatewayRoutePolicy policy = new GatewayRoutePolicy(protectedRoute, roles, false, null, null, null,
                5000, false, false, null);
        return new GatewayRouteConfiguration(1L, 1L, id, id, null, pattern, target, true,
                Set.of("GET"), true, false, 1, policy, headers);
    }

    private String sign(String subject, String role, long ttlMillis) throws Exception {
        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .issuer("gatekeeper-api-management").subject(subject)
                .issueTime(new Date()).expirationTime(new Date(System.currentTimeMillis() + ttlMillis))
                .claim("role", role).build();
        SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
        jwt.sign(new MACSigner(SECRET.getBytes(StandardCharsets.UTF_8)));
        return jwt.serialize();
    }
}
