package in.rajan.nexgate.gateway.security;

import in.rajan.nexgate.gateway.dto.GatewayRouteConfiguration;
import in.rajan.nexgate.gateway.dto.GatewayRoutePolicy;
import in.rajan.nexgate.gateway.error.GatewayException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class RouteAuthorizationServiceTests {
    private GatewayRouteConfiguration route(boolean authRequired, Set<String> roles) {
        GatewayRoutePolicy policy = new GatewayRoutePolicy(authRequired, roles, false, null, null, null, 5000, false, false, null);
        return new GatewayRouteConfiguration(1L, 1L, "r", "R", null, "/r/**", "http://target.test", true,
                Set.of("GET"), true, false, 1, policy, List.of());
    }

    @Test
    void publicProtectedMissingAndRoleBehavior() {
        GatewayJwtValidator validator = mock(GatewayJwtValidator.class);
        RouteAuthorizationService service = new RouteAuthorizationService(validator);
        assertFalse(service.authorize(route(false, Set.of()), null).authenticated());

        when(validator.validate("public-token")).thenReturn(new AuthenticatedPrincipal("public-user", Set.of("USER")));
        AuthorizationResult publicResult = service.authorize(route(false, Set.of()), "Bearer public-token");
        assertTrue(publicResult.authenticated());
        assertEquals("public-user", publicResult.principal().identity());

        GatewayException missing = assertThrows(GatewayException.class,
                () -> service.authorize(route(true, Set.of("TENANT_ADMIN")), null));
        assertEquals(HttpStatus.UNAUTHORIZED, missing.status());

        when(validator.validate("allowed-token")).thenReturn(new AuthenticatedPrincipal("user", Set.of("TENANT_ADMIN")));
        assertTrue(service.authorize(route(true, Set.of("TENANT_ADMIN")), "Bearer allowed-token").authenticated());

        when(validator.validate("denied-token")).thenReturn(new AuthenticatedPrincipal("user", Set.of("USER")));
        GatewayException denied = assertThrows(GatewayException.class,
                () -> service.authorize(route(true, Set.of("TENANT_ADMIN")), "Bearer denied-token"));
        assertEquals(HttpStatus.FORBIDDEN, denied.status());

        GatewayException emptyRoles = assertThrows(GatewayException.class,
                () -> service.authorize(route(true, Set.of()), "Bearer allowed-token"));
        assertEquals(HttpStatus.FORBIDDEN, emptyRoles.status());
    }

    @Test
    void malformedAuthorizationHeaderIsRejected() {
        GatewayJwtValidator validator = mock(GatewayJwtValidator.class);
        RouteAuthorizationService service = new RouteAuthorizationService(validator);
        GatewayException ex = assertThrows(GatewayException.class,
                () -> service.authorize(route(false, Set.of()), "Basic abc"));
        assertEquals(HttpStatus.UNAUTHORIZED, ex.status());
        verifyNoInteractions(validator);
    }
}
