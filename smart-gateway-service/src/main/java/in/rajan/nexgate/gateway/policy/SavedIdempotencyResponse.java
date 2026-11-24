package in.rajan.nexgate.gateway.policy;

import java.util.List;
import java.util.Map;

public record SavedIdempotencyResponse(int status, String bodyBase64, Map<String, List<String>> headers) {}
