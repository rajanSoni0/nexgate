package in.rajan.nexgate.gateway.configuration;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "nexgate.management")
public record ManagementProperties(String baseUrl, String username, String password, long connectTimeoutMs, long readTimeoutMs) {}
