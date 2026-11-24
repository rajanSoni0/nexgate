package in.rajan.nexgate.gateway.error;

import java.time.Instant;

public record GatewayErrorResponse(
        Instant timestamp,
        int status,
        String errorCode,
        String message,
        String path,
        String correlationId
) {}
