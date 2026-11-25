package com.nexgate.common.events;

import java.time.Instant;

public record ConfigurationChangeEvent(
        String eventId,
        Long organizationId,
        String routeId,
        long configurationVersion,
        String changeType,
        Instant occurredAt,
        String source,
        String fetchLatestPath
) {}
