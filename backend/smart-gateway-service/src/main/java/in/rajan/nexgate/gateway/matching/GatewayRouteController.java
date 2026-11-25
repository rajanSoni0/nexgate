package in.rajan.nexgate.gateway.matching;

import org.springframework.http.ResponseEntity;
import in.rajan.nexgate.gateway.proxy.HttpProxyForwarder;
import in.rajan.nexgate.gateway.proxy.ProxyResult;
import in.rajan.nexgate.gateway.correlation.CorrelationIdSupport;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import in.rajan.nexgate.gateway.error.GatewayException;
import in.rajan.nexgate.gateway.routing.RouteRegistry;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import in.rajan.nexgate.gateway.security.RouteAuthorizationService;
import in.rajan.nexgate.gateway.policy.RouteRateLimitService;
import in.rajan.nexgate.gateway.policy.RedisIdempotencyService;
import in.rajan.nexgate.gateway.policy.IdempotencyDecision;
import java.util.Base64;
import in.rajan.nexgate.gateway.dto.GatewayRouteConfiguration;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Locale;
import in.rajan.nexgate.gateway.access.GatewayAccessPublisher;
import in.rajan.nexgate.gateway.access.GatewayAccessEventFactory;

@RestController
public class GatewayRouteController {
    private final RouteRegistry registry;
    private final HttpProxyForwarder forwarder;
    private final String correlationHeader;
    private final RouteAuthorizationService authorizationService;
    private final RouteRateLimitService rateLimitService;
    private final RedisIdempotencyService idempotencyService;
    private final GatewayAccessPublisher accessPublisher;
    private final GatewayAccessEventFactory accessEventFactory;

    public GatewayRouteController(RouteRegistry registry, HttpProxyForwarder forwarder,
                                  RouteAuthorizationService authorizationService,
                                  RouteRateLimitService rateLimitService,
                                  RedisIdempotencyService idempotencyService,
                                  GatewayAccessPublisher accessPublisher,
                                  @Value("${nexgate.correlation.header-name:X-Correlation-ID}") String correlationHeader) {
        this.registry = registry;
        this.forwarder = forwarder;
        this.correlationHeader = correlationHeader;
        this.authorizationService = authorizationService;
        this.rateLimitService = rateLimitService;
        this.idempotencyService = idempotencyService;
        this.accessPublisher = accessPublisher;
        this.accessEventFactory = new GatewayAccessEventFactory();
    }

    @RequestMapping("/**")
    public ResponseEntity<byte[]> routeMatch(HttpServletRequest request) {
        long startedAt = System.nanoTime();
        String path = request.getRequestURI();
        String method = request.getMethod().toUpperCase(Locale.ROOT);
        var match = registry.findMatch(method, path);
        if (match.isEmpty()) {
            var methodMatch = registry.findMatchForOtherMethod(method, path);
            if (methodMatch) throw new GatewayException(HttpStatus.METHOD_NOT_ALLOWED, "METHOD_NOT_ALLOWED",
                    "HTTP method is not allowed for this route");
            throw new GatewayException(HttpStatus.NOT_FOUND, "ROUTE_NOT_FOUND", "No active route matches the request path");
        }
        var authorization = authorizationService.authorize(match.get().route(), request.getHeader("Authorization"));
        rateLimitService.enforce(match.get().route(), authorization, request);

        String idempotencyKey = null;
        boolean idempotencyAcquired = false;
        if ("POST".equals(method) && match.get().route().policy().idempotencyEnabled()) {
            idempotencyKey = request.getHeader("Idempotency-Key");
            IdempotencyDecision decision = idempotencyService.acquire(request, match.get().route(), idempotencyKey);
            if (decision.type() == IdempotencyDecision.Type.REPLAY) {
                var replay = decision.replay();
                HttpHeaders replayHeaders = new HttpHeaders();
                replay.headers().forEach((name, values) -> values.forEach(value -> replayHeaders.add(name, value)));
                replayHeaders.set(correlationHeader, CorrelationIdSupport.from(request));
                byte[] replayBody = Base64.getDecoder().decode(replay.bodyBase64());
                publish(request, match.get().route(), correlationHeader, replay.status(), "IDEMPOTENCY_REPLAY",
                        startedAt, false, true);
                return new ResponseEntity<>(replayBody, replayHeaders, HttpStatus.valueOf(replay.status()));
            }
            idempotencyAcquired = decision.type() == IdempotencyDecision.Type.ACQUIRED;
        }

        ProxyResult result;
        try {
            result = forwarder.forward(request, match.get().route(), correlationHeader,
                CorrelationIdSupport.from(request), authorization);
        } catch (GatewayException ex) {
            if (idempotencyAcquired) idempotencyService.abandon(request, match.get().route(), idempotencyKey);
            throw ex;
        }
        if (idempotencyAcquired) {
            idempotencyService.complete(request, match.get().route(), idempotencyKey,
                    result.status(), result.body(), result.headers());
        }
        HttpHeaders headers = new HttpHeaders();
        result.headers().forEach((name, values) -> values.forEach(value -> headers.add(name, value)));
        headers.set(correlationHeader, CorrelationIdSupport.from(request));
        publish(request, match.get().route(), correlationHeader, result.status(), "FORWARDING_SUCCESS",
                startedAt, false, false);
        return new ResponseEntity<>(result.body(), headers, HttpStatus.valueOf(result.status()));
    }

    private void publish(HttpServletRequest request, GatewayRouteConfiguration route,
                         String correlationHeader, int status, String outcome,
                         long startedAt, boolean rateLimitRejected,
                         boolean idempotencyReplay) {
        long durationMs = (System.nanoTime() - startedAt) / 1_000_000;
        accessPublisher.publish(accessEventFactory.create(request, route,
                CorrelationIdSupport.from(request), status, outcome, durationMs,
                rateLimitRejected, idempotencyReplay));
    }
}
