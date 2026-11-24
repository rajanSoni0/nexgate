package in.rajan.nexgate.analytics.dto;

public record RouteStatisticsResponse(String routeId, String routePath, long requestCount,
                                      double averageResponseTimeMs) {}
