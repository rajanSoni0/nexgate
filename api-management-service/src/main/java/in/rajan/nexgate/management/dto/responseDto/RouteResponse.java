package in.rajan.nexgate.management.dto.responseDto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

public record RouteResponse(
        Long id,
        Long organizationId,
        String routeId,
        String name,
        String description,
        String pathPattern,
        String targetUri,
        boolean stripPrefix,
        Set<String> allowedMethods,
        boolean active,
        boolean deleted,
        long configurationVersion,
        RoutePolicyResponse policy,
        List<HeaderRuleResponse> headerRules,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
