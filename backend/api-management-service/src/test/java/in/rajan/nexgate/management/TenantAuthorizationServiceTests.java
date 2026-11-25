package in.rajan.nexgate.management;

import in.rajan.nexgate.management.exception.ApiException;
import in.rajan.nexgate.management.service.TenantAuthorizationService;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertThrows;

class TenantAuthorizationServiceTests {
    private final TenantAuthorizationService authorization = new TenantAuthorizationService();

    @Test
    void rejectsCrossTenantRouteAccess() {
        Jwt jwt = Jwt.withTokenValue("test")
                .header("alg", "HS256").subject("tenant-admin")
                .issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(60))
                .claim("organizationId", 2L).build();
        var authentication = new UsernamePasswordAuthenticationToken(jwt, null,
                List.of(new SimpleGrantedAuthority("ROLE_TENANT_ADMIN")));
        assertThrows(ApiException.class, () -> authorization.requireOrganization(7L, authentication));
    }

    @Test
    void allowsMatchingTenantRouteAccess() {
        Jwt jwt = Jwt.withTokenValue("test")
                .header("alg", "HS256").subject("tenant-admin")
                .issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(60))
                .claim("organizationId", 7L).build();
        var authentication = new UsernamePasswordAuthenticationToken(jwt, null,
                List.of(new SimpleGrantedAuthority("ROLE_TENANT_ADMIN")));
        authorization.requireOrganization(7L, authentication);
    }
}
