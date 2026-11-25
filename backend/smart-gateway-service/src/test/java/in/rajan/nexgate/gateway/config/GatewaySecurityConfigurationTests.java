package in.rajan.nexgate.gateway.config;

import in.rajan.nexgate.gateway.configuration.RouteStartupLoader;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "nexgate.jwt.secret=test-signing-secret-that-is-at-least-32-bytes",
        "nexgate.jwt.issuer=gatekeeper-api-management",
        "spring.kafka.listener.auto-startup=false"})
class GatewaySecurityConfigurationTests {
    @Autowired MockMvc mvc;
    @MockBean RouteStartupLoader routeStartupLoader;

    @Test
    void unroutedRequestReachesGatewayPipelineInsteadOfBasicAuthChallenge() throws Exception {
        var response = mvc.perform(get("/some/unrouted/path")).andReturn().getResponse();
        // The gateway pipeline answers 404 ROUTE_NOT_FOUND; Boot's default chain would answer 401 + Basic.
        assertEquals(404, response.getStatus());
        assertNull(response.getHeader("WWW-Authenticate"));
    }
}
