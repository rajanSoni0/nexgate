package in.rajan.nexgate.analytics.controller;

import in.rajan.nexgate.analytics.dto.AnalyticsSummaryResponse;
import in.rajan.nexgate.analytics.dto.CountResponse;
import in.rajan.nexgate.analytics.dto.RouteStatisticsResponse;
import in.rajan.nexgate.analytics.statistics.AnalyticsStatisticsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {
    private final AnalyticsStatisticsService statisticsService;

    public AnalyticsController(AnalyticsStatisticsService statisticsService) {
        this.statisticsService = statisticsService;
    }

    @GetMapping("/summary")
    public AnalyticsSummaryResponse summary() {
        return statisticsService.summary();
    }

    @GetMapping("/routes")
    public List<RouteStatisticsResponse> routes() {
        return statisticsService.routes();
    }

    @GetMapping("/slow-routes")
    public List<RouteStatisticsResponse> slowRoutes(@RequestParam(defaultValue = "10") int limit) {
        return statisticsService.slowRoutes(limit);
    }

    @GetMapping("/rate-limit-rejections")
    public CountResponse rateLimitRejections() {
        return statisticsService.rateLimitRejections();
    }

    @GetMapping("/idempotency-replays")
    public CountResponse idempotencyReplays() {
        return statisticsService.idempotencyReplays();
    }
}
