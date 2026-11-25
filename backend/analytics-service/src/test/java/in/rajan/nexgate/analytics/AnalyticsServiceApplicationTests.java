package in.rajan.nexgate.analytics;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.TestPropertySource;
import in.rajan.nexgate.analytics.mongodb.GatewayAccessRecordRepository;

@SpringBootTest
@TestPropertySource(properties = {"spring.kafka.listener.auto-startup=false",
		"nexgate.jwt.secret=test-signing-secret-that-is-at-least-32-bytes"})
class AnalyticsServiceApplicationTests {

	@MockBean
	private GatewayAccessRecordRepository gatewayAccessRecordRepository;

	@Test
	void contextLoads() {
	}

}
