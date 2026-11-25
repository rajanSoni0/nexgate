package in.rajan.nexgate.analytics.dto;

public record AnalyticsSummaryResponse(long totalRequests, long successfulRequests,
                                       long failedRequests, double averageResponseTimeMs) {}
