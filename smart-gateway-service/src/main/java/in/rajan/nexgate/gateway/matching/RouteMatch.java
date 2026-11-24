package in.rajan.nexgate.gateway.matching;

import in.rajan.nexgate.gateway.dto.GatewayRouteConfiguration;

public record RouteMatch(GatewayRouteConfiguration route, String matchedMethod, String normalizedPath) {}
