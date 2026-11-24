package in.rajan.nexgate.gateway.security;

import com.nimbusds.jose.JOSEObjectType;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import in.rajan.nexgate.gateway.error.GatewayException;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.Date;

import static org.junit.jupiter.api.Assertions.*;

class GatewayJwtValidatorTests {
    private static final String SECRET = "test-signing-secret-that-is-at-least-32-bytes";

    @Test
    void validatesValidTokenAndExtractsIdentityAndRole() throws Exception {
        GatewayJwtValidator validator = validator(SECRET);
        String token = sign(SECRET, "gatekeeper-api-management", "user-1", "TENANT_ADMIN", new Date(System.currentTimeMillis() + 60_000));
        AuthenticatedPrincipal principal = validator.validate(token);
        assertEquals("user-1", principal.identity());
        assertTrue(principal.roles().contains("TENANT_ADMIN"));
    }

    @Test
    void rejectsMissingMalformedExpiredAndIncorrectSignature() throws Exception {
        GatewayJwtValidator validator = validator(SECRET);
        assertThrows(GatewayException.class, () -> validator.validate(null));
        assertThrows(GatewayException.class, () -> validator.validate("not-a-jwt"));
        String expired = sign(SECRET, "gatekeeper-api-management", "user-1", "USER", new Date(System.currentTimeMillis() - 60_000));
        assertThrows(GatewayException.class, () -> validator.validate(expired));
        String wrongSignature = sign("different-signing-secret-that-is-at-least-32", "gatekeeper-api-management", "user-1", "USER", new Date(System.currentTimeMillis() + 60_000));
        assertThrows(GatewayException.class, () -> validator.validate(wrongSignature));
    }

    @Test
    void rejectsMissingIdentityOrRoleClaimAndWrongIssuer() throws Exception {
        GatewayJwtValidator validator = validator(SECRET);
        assertThrows(GatewayException.class, () -> validator.validate(sign(SECRET, "gatekeeper-api-management", null, "USER", new Date(System.currentTimeMillis() + 60_000))));
        assertThrows(GatewayException.class, () -> validator.validate(sign(SECRET, "gatekeeper-api-management", "user-1", null, new Date(System.currentTimeMillis() + 60_000))));
        assertThrows(GatewayException.class, () -> validator.validate(sign(SECRET, "wrong-issuer", "user-1", "USER", new Date(System.currentTimeMillis() + 60_000))));
    }

    private GatewayJwtValidator validator(String secret) {
        return new GatewayJwtValidator(new GatewayJwtProperties(secret, "gatekeeper-api-management"));
    }

    private String sign(String secret, String issuer, String subject, String role, Date expiration) throws Exception {
        JWTClaimsSet.Builder claims = new JWTClaimsSet.Builder()
                .issuer(issuer).subject(subject).expirationTime(expiration).issueTime(new Date());
        if (role != null) claims.claim("role", role);
        SignedJWT jwt = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.HS256).type(JOSEObjectType.JWT).build(), claims.build());
        jwt.sign(new MACSigner(secret.getBytes(StandardCharsets.UTF_8)));
        return jwt.serialize();
    }
}
