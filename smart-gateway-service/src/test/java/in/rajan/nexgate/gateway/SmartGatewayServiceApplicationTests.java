package in.rajan.nexgate.gateway;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.boot.test.mock.mockito.MockBean;
import in.rajan.nexgate.gateway.configuration.RouteStartupLoader;

@SpringBootTest
@TestPropertySource(properties = {
    "nexgate.jwt.secret=test-signing-secret-that-is-at-least-32-bytes",
    "nexgate.jwt.issuer=gatekeeper-api-management"
})
class SmartGatewayServiceApplicationTests {

	@MockBean
	private RouteStartupLoader routeStartupLoader;

	@Test
	void contextLoads() {
	}

}
