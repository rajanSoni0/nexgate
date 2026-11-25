package in.rajan.nexgate.gateway.security;

import in.rajan.nexgate.gateway.dto.GatewayRouteConfiguration;
import in.rajan.nexgate.gateway.error.GatewayException;
import org.springframework.http.HttpStatus;

public class RouteAuthorizationService {
    private final GatewayJwtValidator jwtValidator;

    public RouteAuthorizationService(GatewayJwtValidator jwtValidator) {
        this.jwtValidator = jwtValidator;
    }

    public AuthorizationResult authorize(GatewayRouteConfiguration route, String authorizationHeader) {
        if (!route.policy().authenticationRequired()) {
            if (authorizationHeader == null || authorizationHeader.isBlank()) {
                return new AuthorizationResult(null, false);
            }
            String token = extractBearer(authorizationHeader);
            AuthenticatedPrincipal principal = jwtValidator.validate(token);
            return new AuthorizationResult(principal, true);
        }

        if (authorizationHeader == null || authorizationHeader.isBlank()) {
            throw new GatewayException(HttpStatus.UNAUTHORIZED, "MISSING_JWT", "A bearer token is required");
        }
        String token = extractBearer(authorizationHeader);
        AuthenticatedPrincipal principal = jwtValidator.validate(token);
        if (route.policy().permittedRoles() == null || route.policy().permittedRoles().isEmpty()) {
            throw new GatewayException(HttpStatus.FORBIDDEN, "INSUFFICIENT_ROLE", "The authenticated user is not authorized");
        }
        boolean allowed = route.policy().permittedRoles().stream()
                .anyMatch(role -> principal.roles().contains(role));
        if (!allowed) {
            throw new GatewayException(HttpStatus.FORBIDDEN, "INSUFFICIENT_ROLE", "The authenticated user is not authorized");
        }
        return new AuthorizationResult(principal, true);
    }

    String extractBearer(String authorizationHeader) {
        if (!authorizationHeader.regionMatches(true, 0, "Bearer ", 0, 7)) {
            throw new GatewayException(HttpStatus.UNAUTHORIZED, "INVALID_JWT", "Authorization must use Bearer credentials");
        }
        String token = authorizationHeader.substring(7).trim();
        if (token.isBlank()) throw new GatewayException(HttpStatus.UNAUTHORIZED, "INVALID_JWT", "Bearer token is missing");
        return token;
    }
}
