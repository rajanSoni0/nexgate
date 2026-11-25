package in.rajan.nexgate.gateway.error;

import org.springframework.http.HttpStatus;
import java.util.LinkedHashMap;
import java.util.Map;

public class GatewayException extends RuntimeException {
    private final HttpStatus status;
    private final String errorCode;
    private final Map<String, String> headers = new LinkedHashMap<>();

    public GatewayException(HttpStatus status, String errorCode, String message) {
        super(message);
        this.status = status;
        this.errorCode = errorCode;
    }

    public GatewayException(HttpStatus status, String errorCode, String message,
                             String headerName, String headerValue) {
        this(status, errorCode, message);
        headers.put(headerName, headerValue);
    }

    public Map<String, String> headers() { return Map.copyOf(headers); }
    public HttpStatus status() { return status; }
    public String errorCode() { return errorCode; }
}
