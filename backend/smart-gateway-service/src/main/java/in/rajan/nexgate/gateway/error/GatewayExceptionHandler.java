package in.rajan.nexgate.gateway.error;

import in.rajan.nexgate.gateway.correlation.CorrelationIdSupport;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import in.rajan.nexgate.gateway.access.GatewayAccessPublisher;
import in.rajan.nexgate.gateway.access.GatewayAccessEventFactory;

@RestControllerAdvice
public class GatewayExceptionHandler {
    private final GatewayAccessPublisher accessPublisher;
    private final GatewayAccessEventFactory accessEventFactory;

    public GatewayExceptionHandler(GatewayAccessPublisher accessPublisher) {
        this.accessPublisher = accessPublisher;
        this.accessEventFactory = new GatewayAccessEventFactory();
    }


    @ExceptionHandler(GatewayException.class)
    public ResponseEntity<GatewayErrorResponse> handleGateway(GatewayException ex, HttpServletRequest request) {
        ResponseEntity<GatewayErrorResponse> response = error(ex.status(), ex.errorCode(), ex.getMessage(), request);
        accessPublisher.publish(accessEventFactory.create(request, null,
                CorrelationIdSupport.from(request), ex.status().value(), ex.errorCode(), 0,
                ex.status() == HttpStatus.TOO_MANY_REQUESTS, false));
        org.springframework.http.HttpHeaders httpHeaders = new org.springframework.http.HttpHeaders();
        ex.headers().forEach(httpHeaders::set);
        if (!httpHeaders.isEmpty()) {
            return new ResponseEntity<>(response.getBody(), httpHeaders, response.getStatusCode());
        }
        return response;
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<GatewayErrorResponse> handleUnexpected(Exception ex, HttpServletRequest request) {
        ResponseEntity<GatewayErrorResponse> response = error(HttpStatus.INTERNAL_SERVER_ERROR, "GATEWAY_INTERNAL_ERROR",
                "An unexpected gateway error occurred", request);
        accessPublisher.publish(accessEventFactory.create(request, null,
                CorrelationIdSupport.from(request), 500, "GATEWAY_INTERNAL_ERROR", 0, false, false));
        return response;
    }

    public static ResponseEntity<GatewayErrorResponse> error(HttpStatus status, String code, String message,
                                                             HttpServletRequest request) {
        GatewayErrorResponse body = new GatewayErrorResponse(Instant.now(), status.value(), code,
                message, request.getRequestURI(), CorrelationIdSupport.from(request));
        return ResponseEntity.status(status).body(body);
    }
}
