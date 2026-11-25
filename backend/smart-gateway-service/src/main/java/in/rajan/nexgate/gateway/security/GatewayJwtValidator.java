package in.rajan.nexgate.gateway.security;

import in.rajan.nexgate.gateway.error.GatewayException;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

public class GatewayJwtValidator {
    private final JwtDecoder decoder;
    private final GatewayJwtProperties properties;

    public GatewayJwtValidator(GatewayJwtProperties properties) {
        properties.validate();
        this.properties = properties;
        SecretKey key = new SecretKeySpec(properties.secret().getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        this.decoder = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
    }

    public AuthenticatedPrincipal validate(String bearerToken) {
        if (bearerToken == null || bearerToken.isBlank()) throw authenticationRequired();
        try {
            Jwt jwt = decoder.decode(bearerToken);
            Object issuerClaim = jwt.getClaims().get("iss");
            if (issuerClaim == null || !properties.issuer().equals(String.valueOf(issuerClaim))) throw authenticationRequired();
            String identity = jwt.getSubject();
            if (identity == null || identity.isBlank()) throw authenticationRequired();

            Set<String> roles = new LinkedHashSet<>();
            Object roleClaim = jwt.getClaim("role");
            if (roleClaim instanceof String role && !role.isBlank()) roles.add(role);
            Object rolesClaim = jwt.getClaim("roles");
            if (rolesClaim instanceof String role && !role.isBlank()) roles.add(role);
            if (rolesClaim instanceof List<?> values) values.forEach(value -> {
                if (value instanceof String role && !role.isBlank()) roles.add(role);
            });
            if (roles.isEmpty()) throw authenticationRequired();
            return new AuthenticatedPrincipal(identity, Set.copyOf(roles));
        } catch (JwtException ex) {
            throw new GatewayException(HttpStatus.UNAUTHORIZED, "INVALID_JWT", "The bearer token is invalid or expired");
        } catch (GatewayException ex) {
            throw ex;
        } catch (RuntimeException ex) {
            throw new GatewayException(HttpStatus.UNAUTHORIZED, "INVALID_JWT", "The bearer token is invalid");
        }
    }

    private GatewayException authenticationRequired() {
        return new GatewayException(HttpStatus.UNAUTHORIZED, "INVALID_JWT", "A valid bearer token is required");
    }
}
