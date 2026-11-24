package in.rajan.nexgate.analytics.statistics;

import in.rajan.nexgate.analytics.dto.AnalyticsSummaryResponse;
import in.rajan.nexgate.analytics.dto.CountResponse;
import in.rajan.nexgate.analytics.dto.RouteStatisticsResponse;
import in.rajan.nexgate.analytics.mongodb.GatewayAccessRecord;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;
import org.springframework.stereotype.Service;
import org.springframework.data.mongodb.core.aggregation.ConditionalOperators;
import org.springframework.data.mongodb.core.query.Criteria;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.springframework.data.mongodb.core.aggregation.Aggregation.*;

@Service
public class AnalyticsStatisticsService {
    private final MongoTemplate mongoTemplate;

    public AnalyticsStatisticsService(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    public AnalyticsSummaryResponse summary() {
        Aggregation aggregation = newAggregation(GatewayAccessRecord.class,
                group()
                        .count().as("total")
                        .avg("durationMs").as("average")
                        .sum(ConditionalOperators.when(Criteria.where("status").lt(400)).then(1).otherwise(0)).as("successful")
                        .sum(ConditionalOperators.when(Criteria.where("status").gte(400)).then(1).otherwise(0)).as("failed"));
        AggregationResults<Map> result = mongoTemplate.aggregate(aggregation, GatewayAccessRecord.class, Map.class);
        Map first = result.getUniqueMappedResult();
        if (first == null) return new AnalyticsSummaryResponse(0, 0, 0, 0.0);
        return new AnalyticsSummaryResponse(number(first, "total"), number(first, "successful"),
                number(first, "failed"), decimal(first, "average"));
    }

    public List<RouteStatisticsResponse> routes() {
        Aggregation aggregation = newAggregation(GatewayAccessRecord.class,
                group("routeId", "routePath")
                        .count().as("requestCount")
                        .avg("durationMs").as("averageResponseTimeMs"),
                sort(Sort.Direction.ASC, "routeId"));
        AggregationResults<Map> result = mongoTemplate.aggregate(aggregation, GatewayAccessRecord.class, Map.class);
        List<RouteStatisticsResponse> responses = new ArrayList<>();
        for (Map row : result.getMappedResults()) {
            Map id = (Map) row.get("_id");
            responses.add(new RouteStatisticsResponse(string(id, "routeId"), string(id, "routePath"),
                    number(row, "requestCount"), decimal(row, "averageResponseTimeMs")));
        }
        return responses;
    }

    public List<RouteStatisticsResponse> slowRoutes(int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 100));
        Aggregation aggregation = newAggregation(GatewayAccessRecord.class,
                group("routeId", "routePath")
                        .count().as("requestCount")
                        .avg("durationMs").as("averageResponseTimeMs"),
                sort(Sort.Direction.DESC, "averageResponseTimeMs"),
                limit(safeLimit));
        AggregationResults<Map> result = mongoTemplate.aggregate(aggregation, GatewayAccessRecord.class, Map.class);
        List<RouteStatisticsResponse> responses = new ArrayList<>();
        for (Map row : result.getMappedResults()) {
            Map id = (Map) row.get("_id");
            responses.add(new RouteStatisticsResponse(string(id, "routeId"), string(id, "routePath"),
                    number(row, "requestCount"), decimal(row, "averageResponseTimeMs")));
        }
        return responses;
    }

    public CountResponse rateLimitRejections() {
        Aggregation aggregation = newAggregation(GatewayAccessRecord.class,
                match(Criteria.where("rateLimitRejected").is(true)),
                group().count().as("total"));
        return count(aggregation);
    }

    public CountResponse idempotencyReplays() {
        Aggregation aggregation = newAggregation(GatewayAccessRecord.class,
                match(Criteria.where("idempotencyReplay").is(true)),
                group().count().as("total"));
        return count(aggregation);
    }

    private CountResponse count(Aggregation aggregation) {
        AggregationResults<Map> result = mongoTemplate.aggregate(aggregation, GatewayAccessRecord.class, Map.class);
        Map first = result.getUniqueMappedResult();
        return new CountResponse(first == null ? 0 : number(first, "total"));
    }

    private long number(Map row, String field) {
        Object value = row.get(field);
        if (value == null) return 0;
        if (value instanceof Number number) return number.longValue();
        return Long.parseLong(value.toString());
    }

    private double decimal(Map row, String field) {
        Object value = row.get(field);
        if (value == null) return 0.0;
        if (value instanceof Number number) return number.doubleValue();
        return Double.parseDouble(value.toString());
    }

    private String string(Map row, String field) {
        Object value = row.get(field);
        return value == null ? "" : value.toString();
    }
}
