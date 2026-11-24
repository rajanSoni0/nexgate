package in.rajan.nexgate.analytics.mongodb;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "gateway_access_events")
public record GatewayAccessRecord(
        @Id String id,
        @Indexed(unique = true) String eventId,
        String correlationId,
        Long organizationId,
        String routeId,
        String routePath,
        String httpMethod,
        int status,
        String outcome,
        long durationMs,
        boolean rateLimitRejected,
        boolean idempotencyReplay,
        Instant timestamp,
        Instant processedAt
) {}
