package in.rajan.nexgate.gateway.correlation;

import jakarta.servlet.http.HttpServletRequest;
import java.util.UUID;

public final class CorrelationIdSupport {
    private CorrelationIdSupport() {}

    public static String from(HttpServletRequest request) {
        Object value = request.getAttribute("nexgate.correlationId");
        return value instanceof String id ? id : UUID.randomUUID().toString();
    }
}
