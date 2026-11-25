package in.rajan.nexgate.gateway.policy;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import in.rajan.nexgate.gateway.dto.GatewayRouteConfiguration;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.List;
import java.util.Map;

public class RedisIdempotencyService {
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final IdempotencyProperties properties;

    public RedisIdempotencyService(StringRedisTemplate redisTemplate, ObjectMapper objectMapper,
                                   IdempotencyProperties properties) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
        this.properties = properties;
    }

    public IdempotencyDecision acquire(HttpServletRequest request, GatewayRouteConfiguration route,
                                       String idempotencyKey) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new IdempotencyException(400, "IDEMPOTENCY_KEY_REQUIRED", "Idempotency-Key is required");
        }
        String key = key(route, idempotencyKey);
        String fingerprint = payloadFingerprint(request);
        try {
            String existing = redisTemplate.opsForValue().get(key);
            if (existing == null) {
                if (Boolean.FALSE.equals(redisTemplate.opsForValue().setIfAbsent(key,
                        record("PROCESSING", fingerprint, null), java.time.Duration.ofSeconds(properties.ttlSeconds())))) {
                    existing = redisTemplate.opsForValue().get(key);
                    if (existing == null) {
                        throw new IdempotencyException(409, "IDEMPOTENCY_CONFLICT", "The idempotency key is already being processed");
                    }
                    return evaluateExisting(existing, fingerprint);
                }
                return new IdempotencyDecision(IdempotencyDecision.Type.ACQUIRED, null);
            }
            return evaluateExisting(existing, fingerprint);
        } catch (RedisConnectionFailureException ex) {
            throw new IdempotencyException(503, "IDEMPOTENCY_STORE_UNAVAILABLE", "The idempotency store is temporarily unavailable");
        }
    }

    public void complete(HttpServletRequest request, GatewayRouteConfiguration route,
                         String idempotencyKey, int status, byte[] body,
                         Map<String, List<String>> headers) {
        String key = key(route, idempotencyKey);
        try {
            Map<String, Object> response = Map.of(
                    "status", status,
                    "bodyBase64", Base64.getEncoder().encodeToString(body == null ? new byte[0] : body),
                    "headers", headers == null ? Map.of() : headers);
            redisTemplate.opsForValue().set(key,
                    record("COMPLETED", payloadFingerprint(request), response),
                    java.time.Duration.ofSeconds(properties.ttlSeconds()));
        } catch (RedisConnectionFailureException ex) {
            throw new IdempotencyException(503, "IDEMPOTENCY_STORE_UNAVAILABLE", "The idempotency store is temporarily unavailable");
        }
    }

    public void abandon(HttpServletRequest request, GatewayRouteConfiguration route, String idempotencyKey) {
        if (idempotencyKey == null) return;
        try {
            redisTemplate.delete(key(route, idempotencyKey));
        } catch (RedisConnectionFailureException ignored) {
        }
    }

    private IdempotencyDecision evaluateExisting(String existing, String fingerprint) {
        try {
            Map<String, Object> record = objectMapper.readValue(existing, new TypeReference<>() {});
            if (!fingerprint.equals(record.get("payloadFingerprint"))) {
                throw new IdempotencyException(409, "IDEMPOTENCY_CONFLICT", "The idempotency key was used with a different payload");
            }
            if ("PROCESSING".equals(record.get("state"))) {
                throw new IdempotencyException(409, "IDEMPOTENCY_CONFLICT", "The idempotency key is already being processed");
            }
            if ("COMPLETED".equals(record.get("state"))) {
                Object responseValue = record.get("response");
                SavedIdempotencyResponse response;
                if (responseValue instanceof Map<?, ?> map) {
                    int status = ((Number) map.get("status")).intValue();
                    String bodyBase64 = String.valueOf(map.get("bodyBase64"));
                    Map<String, List<String>> headers = objectMapper.convertValue(map.get("headers"),
                            new TypeReference<>() {});
                    response = new SavedIdempotencyResponse(status, bodyBase64, headers);
                } else {
                    response = objectMapper.convertValue(responseValue, SavedIdempotencyResponse.class);
                }
                return new IdempotencyDecision(IdempotencyDecision.Type.REPLAY, response);
            }
            throw new IdempotencyException(409, "IDEMPOTENCY_CONFLICT", "The idempotency record is invalid");
        } catch (IdempotencyException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new IdempotencyException(409, "IDEMPOTENCY_CONFLICT", "The idempotency record is invalid");
        }
    }

    private String record(String state, String fingerprint, Object response) {
        try {
            return objectMapper.writeValueAsString(Map.of(
                    "state", state,
                    "payloadFingerprint", fingerprint,
                    "response", response == null ? Map.of() : response));
        } catch (Exception ex) {
            throw new IdempotencyException(500, "IDEMPOTENCY_INTERNAL_ERROR", "Unable to store idempotency state");
        }
    }

    private String payloadFingerprint(HttpServletRequest request) {
        try {
            byte[] body = requestBody(request);
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            digest.update(request.getMethod().getBytes(StandardCharsets.UTF_8));
            digest.update(("|" + (request.getQueryString() == null ? "" : request.getQueryString())).getBytes(StandardCharsets.UTF_8));
            digest.update(body);
            return Base64.getUrlEncoder().withoutPadding().encodeToString(digest.digest());
        } catch (Exception ex) {
            throw new IdempotencyException(400, "IDEMPOTENCY_PAYLOAD_ERROR", "Unable to read the idempotency payload");
        }
    }

    public static byte[] requestBody(HttpServletRequest request) {
        try {
            Object cached = request.getAttribute("nexgate.requestBody");
            if (cached instanceof byte[] bytes) return bytes;
            byte[] body = request.getInputStream().readAllBytes();
            request.setAttribute("nexgate.requestBody", body);
            return body;
        } catch (Exception ex) {
            throw new IdempotencyException(400, "IDEMPOTENCY_PAYLOAD_ERROR", "Unable to read the idempotency payload");
        }
    }

    private String key(GatewayRouteConfiguration route, String idempotencyKey) {
        long organizationId = route.organizationId() == null ? -1L : route.organizationId();
        String safeKey = idempotencyKey.replaceAll("[^A-Za-z0-9._~-]", "_");
        if (safeKey.length() > 128) safeKey = safeKey.substring(0, 128);
        return "nexgate:idempotency:" + organizationId + ":" + sanitize(route.routeId()) + ":" + safeKey;
    }

    private String sanitize(String value) {
        if (value == null || value.isBlank()) return "unknown";
        String safe = value.replaceAll("[^A-Za-z0-9._~-]", "_");
        return safe.length() <= 128 ? safe : safe.substring(0, 128);
    }

    public static class IdempotencyException extends RuntimeException {
        private final int status;
        private final String code;
        private final String message;
        public IdempotencyException(int status, String code, String message) {
            super(message); this.status = status; this.code = code; this.message = message;
        }
        public int status() { return status; }
        public String code() { return code; }
        public String message() { return message; }
    }
}
