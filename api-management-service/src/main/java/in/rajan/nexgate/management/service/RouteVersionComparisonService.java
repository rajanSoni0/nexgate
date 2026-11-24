package in.rajan.nexgate.management.service;

import in.rajan.nexgate.management.dto.requestDto.HeaderRuleRequest;
import in.rajan.nexgate.management.dto.requestDto.RouteRequest;
import in.rajan.nexgate.management.dto.responseDto.RouteVersionFieldDifference;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class RouteVersionComparisonService {

    public List<RouteVersionFieldDifference> compare(RouteRequest from, RouteRequest to) {
        List<RouteVersionFieldDifference> differences = new ArrayList<>();
        add(differences, "route.name", from.name(), to.name());
        add(differences, "route.description", from.description(), to.description());
        add(differences, "route.pathPattern", from.pathPattern(), to.pathPattern());
        add(differences, "route.targetUri", from.targetUri(), to.targetUri());
        add(differences, "route.stripPrefix", from.stripPrefix(), to.stripPrefix());
        add(differences, "route.allowedMethods", sorted(from.allowedMethods()), sorted(to.allowedMethods()));
        add(differences, "route.active", from.active(), to.active());

        add(differences, "policy.authenticationRequired", from.policy().authenticationRequired(), to.policy().authenticationRequired());
        add(differences, "policy.permittedRoles", sorted(from.policy().permittedRoles()), sorted(to.policy().permittedRoles()));
        add(differences, "policy.rateLimitEnabled", from.policy().rateLimitEnabled(), to.policy().rateLimitEnabled());
        add(differences, "policy.rateLimitRequests", from.policy().rateLimitRequests(), to.policy().rateLimitRequests());
        add(differences, "policy.rateLimitWindowSeconds", from.policy().rateLimitWindowSeconds(), to.policy().rateLimitWindowSeconds());
        add(differences, "policy.rateLimitScope", from.policy().rateLimitScope(), to.policy().rateLimitScope());
        add(differences, "policy.timeoutMs", from.policy().timeoutMs(), to.policy().timeoutMs());
        add(differences, "policy.idempotencyEnabled", from.policy().idempotencyEnabled(), to.policy().idempotencyEnabled());
        add(differences, "policy.rewriteEnabled", from.policy().rewriteEnabled(), to.policy().rewriteEnabled());
        add(differences, "policy.rewriteTargetPrefix", from.policy().rewriteTargetPrefix(), to.policy().rewriteTargetPrefix());
        add(differences, "headers", normalizedHeaders(from.headerRules()), normalizedHeaders(to.headerRules()));
        return differences;
    }

    private void add(List<RouteVersionFieldDifference> differences, String field, Object from, Object to) {
        if (!Objects.equals(from, to)) {
            differences.add(new RouteVersionFieldDifference(field, from, to));
        }
    }

    private List<String> sorted(Collection<String> values) {
        if (values == null) return List.of();
        return values.stream().sorted().toList();
    }

    private List<String> normalizedHeaders(List<HeaderRuleRequest> rules) {
        if (rules == null) return List.of();
        return rules.stream()
                .map(rule -> rule.direction().name() + "|" + rule.action().name() + "|" + rule.headerName() + "|" + Objects.toString(rule.headerValue(), ""))
                .sorted().toList();
    }
}
