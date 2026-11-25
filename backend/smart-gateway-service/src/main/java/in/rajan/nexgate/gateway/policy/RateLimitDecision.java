package in.rajan.nexgate.gateway.policy;

public record RateLimitDecision(boolean allowed, long limit, long count, long retryAfterSeconds) {}
