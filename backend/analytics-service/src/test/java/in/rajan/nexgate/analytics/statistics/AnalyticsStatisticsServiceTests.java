package in.rajan.nexgate.analytics.statistics;

import in.rajan.nexgate.analytics.mongodb.GatewayAccessRecord;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AnalyticsStatisticsServiceTests {
    @SuppressWarnings({"unchecked", "rawtypes"})
    @Test
    void emptySummaryReturnsZeros() {
        MongoTemplate mongoTemplate = mock(MongoTemplate.class);
        AggregationResults<Map> results = mock(AggregationResults.class);
        when(results.getUniqueMappedResult()).thenReturn(null);
        when(mongoTemplate.aggregate(any(), eq(GatewayAccessRecord.class), eq(Map.class))).thenReturn(results);

        var response = new AnalyticsStatisticsService(mongoTemplate).summary();

        assertEquals(0, response.totalRequests());
        assertEquals(0, response.successfulRequests());
        assertEquals(0, response.failedRequests());
        assertEquals(0.0, response.averageResponseTimeMs());
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    @Test
    void summaryUsesAggregationValues() {
        MongoTemplate mongoTemplate = mock(MongoTemplate.class);
        AggregationResults<Map> results = mock(AggregationResults.class);
        when(results.getUniqueMappedResult()).thenReturn(Map.of(
                "total", 10L, "successful", 8L, "failed", 2L, "average", 125.5));
        when(mongoTemplate.aggregate(any(), eq(GatewayAccessRecord.class), eq(Map.class))).thenReturn(results);

        var response = new AnalyticsStatisticsService(mongoTemplate).summary();

        assertEquals(10, response.totalRequests());
        assertEquals(8, response.successfulRequests());
        assertEquals(2, response.failedRequests());
        assertEquals(125.5, response.averageResponseTimeMs());
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    @Test
    void emptyRoutesAndCountersReturnGracefully() {
        MongoTemplate mongoTemplate = mock(MongoTemplate.class);
        AggregationResults<Map> routeResults = mock(AggregationResults.class);
        when(routeResults.getMappedResults()).thenReturn(List.of());
        when(mongoTemplate.aggregate(any(), eq(GatewayAccessRecord.class), eq(Map.class))).thenReturn(routeResults);

        var service = new AnalyticsStatisticsService(mongoTemplate);

        assertEquals(List.of(), service.routes());
        assertEquals(0, service.rateLimitRejections().total());
        assertEquals(0, service.idempotencyReplays().total());
    }
}
