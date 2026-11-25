package in.rajan.nexgate.gateway.policy;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "nexgate.redis")
public record RateLimitProperties(String url) {}
