package in.rajan.nexgate.gateway.security;

public record AuthorizationResult(AuthenticatedPrincipal principal, boolean authenticated) {}
