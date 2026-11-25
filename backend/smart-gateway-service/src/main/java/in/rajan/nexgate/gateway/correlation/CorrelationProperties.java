package in.rajan.nexgate.gateway.correlation;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "nexgate.correlation")
public record CorrelationProperties(String headerName, int maxLength) {}
