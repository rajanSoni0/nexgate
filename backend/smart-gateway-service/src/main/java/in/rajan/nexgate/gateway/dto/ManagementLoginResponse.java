package in.rajan.nexgate.gateway.dto;

public record ManagementLoginResponse(String token, String tokenType, long expiresInSeconds, String role, Long organizationId) {}
