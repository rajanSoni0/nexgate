package in.rajan.nexgate.gateway.policy;

public record IdempotencyDecision(Type type, SavedIdempotencyResponse replay) {
    public enum Type { ACQUIRED, REPLAY, CONFLICT }
}
