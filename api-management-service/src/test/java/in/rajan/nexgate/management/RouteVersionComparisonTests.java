package in.rajan.nexgate.management;

import in.rajan.nexgate.management.dto.requestDto.HeaderRuleRequest;
import in.rajan.nexgate.management.dto.requestDto.RoutePolicyRequest;
import in.rajan.nexgate.management.dto.requestDto.RouteRequest;
import in.rajan.nexgate.management.entity.HeaderRuleAction;
import in.rajan.nexgate.management.entity.HeaderRuleDirection;
import in.rajan.nexgate.management.service.RouteVersionComparisonService;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RouteVersionComparisonTests {
    private final RouteVersionComparisonService service = new RouteVersionComparisonService();

    @Test
    void reportsFieldLevelDifferences() {
        RoutePolicyRequest fromPolicy = new RoutePolicyRequest(true, Set.of("TENANT_ADMIN"), true, 100, 60, "ROUTE", 5000, true, true, "/old");
        RoutePolicyRequest toPolicy = new RoutePolicyRequest(false, Set.of("USER"), true, 200, 30, "USER", 3000, false, false, null);
        RouteRequest from = new RouteRequest(1L, "catalog", "Catalog", "Old", "/catalog/**", "https://old.example", true,
                Set.of("GET"), true, fromPolicy, List.of(new HeaderRuleRequest(HeaderRuleDirection.REQUEST, HeaderRuleAction.ADD, "X-Test", "old")));
        RouteRequest to = new RouteRequest(1L, "catalog", "Catalog", "New", "/catalog/**", "https://new.example", false,
                Set.of("GET", "POST"), false, toPolicy, List.of(new HeaderRuleRequest(HeaderRuleDirection.REQUEST, HeaderRuleAction.ADD, "X-Test", "new")));

        var differences = service.compare(from, to);

        assertTrue(differences.stream().anyMatch(d -> d.field().equals("route.description")));
        assertTrue(differences.stream().anyMatch(d -> d.field().equals("route.targetUri")));
        assertTrue(differences.stream().anyMatch(d -> d.field().equals("route.allowedMethods")));
        assertTrue(differences.stream().anyMatch(d -> d.field().equals("policy.timeoutMs") && d.from().equals(5000) && d.to().equals(3000)));
        assertTrue(differences.stream().anyMatch(d -> d.field().equals("policy.rateLimitRequests") && d.from().equals(100) && d.to().equals(200)));
        assertTrue(differences.stream().anyMatch(d -> d.field().equals("policy.idempotencyEnabled")));
        assertTrue(differences.stream().anyMatch(d -> d.field().equals("policy.rewriteTargetPrefix")));
        assertTrue(differences.stream().anyMatch(d -> d.field().equals("headers")));
        assertTrue(differences.size() >= 10);
    }
}
