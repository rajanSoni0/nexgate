package in.rajan.nexgate.gateway.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "nexgate.jwt")
public record GatewayJwtProperties(String secret, String issuer) {
    public void validate() {
        if (secret == null || secret.isBlank()) throw new IllegalStateException("NEXGATE_JWT_SECRET must be configured");
        if (secret.getBytes(java.nio.charset.StandardCharsets.UTF_8).length < 32)
            throw new IllegalStateException("NEXGATE_JWT_SECRET must be at least 32 bytes");
        if (issuer == null || issuer.isBlank()) throw new IllegalStateException("NEXGATE_JWT_ISSUER must be configured");
    }
}
