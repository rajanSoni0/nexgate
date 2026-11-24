package com.nexgate.common.events;

import java.time.Instant;

public record GatewayAccessEvent(
        String eventId,
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
        Instant timestamp
) {}
