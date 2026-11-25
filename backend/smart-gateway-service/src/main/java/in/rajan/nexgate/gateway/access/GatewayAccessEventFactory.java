package in.rajan.nexgate.gateway.access;

import com.nexgate.common.events.GatewayAccessEvent;
import in.rajan.nexgate.gateway.dto.GatewayRouteConfiguration;
import jakarta.servlet.http.HttpServletRequest;

import java.time.Instant;
import java.util.UUID;

public class GatewayAccessEventFactory {
    public GatewayAccessEvent create(HttpServletRequest request, GatewayRouteConfiguration route,
                                     String correlationId, int status, String outcome,
                                     long durationMs, boolean rateLimitRejected,
                                     boolean idempotencyReplay) {
        return new GatewayAccessEvent(
                UUID.randomUUID().toString(),
                correlationId,
                route == null ? null : route.organizationId(),
                route == null ? null : route.routeId(),
                request.getRequestURI(),
                request.getMethod(),
                status,
                outcome,
                durationMs,
                rateLimitRejected,
                idempotencyReplay,
                Instant.now());
    }
}
