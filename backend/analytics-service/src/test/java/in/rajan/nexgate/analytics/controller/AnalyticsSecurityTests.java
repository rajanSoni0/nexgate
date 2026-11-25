package in.rajan.nexgate.analytics.controller;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import in.rajan.nexgate.analytics.dto.AnalyticsSummaryResponse;
import in.rajan.nexgate.analytics.mongodb.GatewayAccessRecordRepository;
import in.rajan.nexgate.analytics.statistics.AnalyticsStatisticsService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Date;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {"spring.kafka.listener.auto-startup=false",
        "nexgate.jwt.secret=" + AnalyticsSecurityTests.SECRET,
        "nexgate.jwt.issuer=gatekeeper-api-management"})
class AnalyticsSecurityTests {
    static final String SECRET = "test-signing-secret-that-is-at-least-32-bytes";

    @Autowired MockMvc mvc;
    @MockBean GatewayAccessRecordRepository repository;
    @MockBean AnalyticsStatisticsService statisticsService;

    private String token(String role, String issuer, String secret, long ttlMs) throws Exception {
        JWTClaimsSet claims = new JWTClaimsSet.Builder().subject("platform-admin").issuer(issuer)
                .claim("role", role).issueTime(new Date())
                .expirationTime(new Date(System.currentTimeMillis() + ttlMs)).build();
        SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
        jwt.sign(new MACSigner(secret.getBytes()));
        return jwt.serialize();
    }

    @Test
    void platformAdminJwtIsAccepted() throws Exception {
        when(statisticsService.summary()).thenReturn(new AnalyticsSummaryResponse(0, 0, 0, 0.0));
        mvc.perform(get("/api/analytics/summary").header("Authorization",
                "Bearer " + token("PLATFORM_ADMIN", "gatekeeper-api-management", SECRET, 60_000)))
                .andExpect(status().isOk());
    }

    @Test
    void missingTokenIsUnauthorized() throws Exception {
        mvc.perform(get("/api/analytics/summary")).andExpect(status().isUnauthorized());
    }

    @Test
    void tenantAdminIsForbidden() throws Exception {
        mvc.perform(get("/api/analytics/summary").header("Authorization",
                "Bearer " + token("TENANT_ADMIN", "gatekeeper-api-management", SECRET, 60_000)))
                .andExpect(status().isForbidden());
    }

    @Test
    void wrongSecretWrongIssuerAndExpiredAreRejected() throws Exception {
        String other = "another-signing-secret-that-is-32-bytes-long";
        mvc.perform(get("/api/analytics/summary").header("Authorization",
                "Bearer " + token("PLATFORM_ADMIN", "gatekeeper-api-management", other, 60_000)))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/analytics/summary").header("Authorization",
                "Bearer " + token("PLATFORM_ADMIN", "evil", SECRET, 60_000)))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/analytics/summary").header("Authorization",
                "Bearer " + token("PLATFORM_ADMIN", "gatekeeper-api-management", SECRET, -120_000)))
                .andExpect(status().isUnauthorized());
    }
}
