package in.rajan.nexgate.gateway.security;

import java.util.Set;

public record AuthenticatedPrincipal(String identity, Set<String> roles) {}
