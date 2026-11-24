package in.rajan.nexgate.gateway.dto;

import java.util.List;
import java.util.Set;

public record GatewayRouteConfiguration(
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
        GatewayRoutePolicy policy,
        List<GatewayHeaderRule> headerRules
) {}
