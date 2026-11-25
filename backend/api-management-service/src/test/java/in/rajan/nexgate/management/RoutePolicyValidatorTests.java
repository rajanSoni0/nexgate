package in.rajan.nexgate.management;

import in.rajan.nexgate.management.dto.requestDto.RoutePolicyRequest;
import in.rajan.nexgate.management.dto.requestDto.RouteRequest;
import in.rajan.nexgate.management.exception.ApiException;
import in.rajan.nexgate.management.service.RoutePolicyValidator;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class RoutePolicyValidatorTests {
    private final RoutePolicyValidator validator = new RoutePolicyValidator();

    @Test
    void rejectsInvalidRateLimit() {
        RouteRequest request = validRequest(new RoutePolicyRequest(true, Set.of("TENANT_ADMIN"), true, 0, 60, "USER", 1000, false, false, null));
        assertThrows(ApiException.class, () -> validator.validate(request));
    }

    @Test
    void rejectsIdempotencyWithoutPost() {
        RouteRequest request = validRequest(new RoutePolicyRequest(false, Set.of(), false, null, null, null, 1000, true, false, null), Set.of("GET"));
        assertThrows(ApiException.class, () -> validator.validate(request));
    }

    @Test
    void acceptsValidPolicy() {
        RouteRequest request = validRequest(new RoutePolicyRequest(true, Set.of("TENANT_ADMIN"), true, 100, 60, "ROUTE", 5000, true, true, "/orders"));
        assertDoesNotThrow(() -> validator.validate(request));
    }

    private RouteRequest validRequest(RoutePolicyRequest policy) {
        return validRequest(policy, Set.of("GET", "POST"));
    }

    private RouteRequest validRequest(RoutePolicyRequest policy, Set<String> methods) {
        return new RouteRequest(1L, "catalog-list", "Catalog", null, "/catalog/**", "https://catalog:8082", false,
                methods, true, policy, List.of());
    }
}
