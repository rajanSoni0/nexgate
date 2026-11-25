package in.rajan.nexgate.gateway.correlation;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.*;

class CorrelationIdFilterTests {
    private final CorrelationProperties properties = new CorrelationProperties("X-Correlation-ID", 128);

    @Test
    void generatesAndPropagatesCorrelationIdWhenMissing() throws Exception {
        CorrelationIdFilter filter = new CorrelationIdFilter(properties);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/catalog");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = (servletRequest, servletResponse) -> {
            assertNotNull(request.getAttribute("nexgate.correlationId"));
            assertEquals(request.getAttribute("nexgate.correlationId"), response.getHeader("X-Correlation-ID"));
        };
        filter.doFilter(request, response, chain);
        assertTrue(response.getHeader("X-Correlation-ID").length() > 0);
    }

    @Test
    void preservesValidExistingCorrelationId() throws Exception {
        CorrelationIdFilter filter = new CorrelationIdFilter(properties);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/catalog");
        request.addHeader("X-Correlation-ID", "valid-id_123");
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, (a, b) -> {});
        assertEquals("valid-id_123", response.getHeader("X-Correlation-ID"));
    }

    @Test
    void replacesMalformedOrLongCorrelationId() throws Exception {
        CorrelationIdFilter filter = new CorrelationIdFilter(properties);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/catalog");
        request.addHeader("X-Correlation-ID", "bad id<script>");
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, (a, b) -> {});
        assertNotEquals("bad id<script>", response.getHeader("X-Correlation-ID"));
        assertTrue(response.getHeader("X-Correlation-ID").matches("^[A-Za-z0-9-]{36}$"));
    }
}
