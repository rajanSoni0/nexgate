package in.rajan.nexgate.gateway.policy;

import in.rajan.nexgate.gateway.correlation.CorrelationIdSupport;
import in.rajan.nexgate.gateway.error.GatewayErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;

@RestControllerAdvice
public class IdempotencyExceptionHandlerAdapter {
    @ExceptionHandler(RedisIdempotencyService.IdempotencyException.class)
    public ResponseEntity<GatewayErrorResponse> handle(RedisIdempotencyService.IdempotencyException ex,
                                                       HttpServletRequest request) {
        org.springframework.http.HttpStatus status = org.springframework.http.HttpStatus.valueOf(ex.status());
        GatewayErrorResponse body = new GatewayErrorResponse(Instant.now(), ex.status(), ex.code(), ex.message(),
                request.getRequestURI(), CorrelationIdSupport.from(request));
        return ResponseEntity.status(status).body(body);
    }
}
