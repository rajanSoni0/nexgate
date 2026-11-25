package in.rajan.nexgate.management.service;

import in.rajan.nexgate.management.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

@Component
public class TenantAuthorizationService {

    public Long organizationId(Authentication authentication) {
        if (authentication == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        if (authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_PLATFORM_ADMIN"))) {
            return null;
        }
        if (authentication.getPrincipal() instanceof Jwt jwt) {
            Object organizationId = jwt.getClaim("organizationId");
            if (organizationId instanceof Number number) {
                return number.longValue();
            }
            if (organizationId instanceof String value) {
                try {
                    return Long.parseLong(value);
                } catch (NumberFormatException ignored) {
                }
            }
        }
        throw new ApiException(HttpStatus.FORBIDDEN, "Tenant administrator organization claim is missing");
    }

    public void requireOrganization(Long routeOrganizationId, Authentication authentication) {
        Long authenticatedOrganizationId = organizationId(authentication);
        if (authenticatedOrganizationId != null && !authenticatedOrganizationId.equals(routeOrganizationId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Cross-tenant access is not permitted");
        }
    }
}
