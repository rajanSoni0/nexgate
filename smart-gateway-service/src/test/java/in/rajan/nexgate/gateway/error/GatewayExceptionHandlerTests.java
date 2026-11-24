package in.rajan.nexgate.gateway.error;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class GatewayExceptionHandlerTests {
    @Test
    void buildsConsistentGatewayErrorWithoutInternalDetails() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRequestURI()).thenReturn("/catalog/1");
        when(request.getAttribute("nexgate.correlationId")).thenReturn("corr-123");

        var response = GatewayExceptionHandler.error(HttpStatus.NOT_FOUND, "ROUTE_NOT_FOUND",
                "No active route matches the request path", request);

        assertEquals(404, response.getBody().status());
        assertEquals("ROUTE_NOT_FOUND", response.getBody().errorCode());
        assertEquals("corr-123", response.getBody().correlationId());
        assertEquals("/catalog/1", response.getBody().path());
    }
}
