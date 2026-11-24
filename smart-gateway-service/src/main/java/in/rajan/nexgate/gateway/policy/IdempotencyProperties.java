package in.rajan.nexgate.gateway.policy;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "nexgate.idempotency")
public record IdempotencyProperties(long ttlSeconds) {
    public IdempotencyProperties {
        if (ttlSeconds < 1) ttlSeconds = 86400;
    }
}
