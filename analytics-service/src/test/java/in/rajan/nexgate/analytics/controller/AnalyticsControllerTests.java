package in.rajan.nexgate.analytics.controller;

import in.rajan.nexgate.analytics.dto.AnalyticsSummaryResponse;
import in.rajan.nexgate.analytics.statistics.AnalyticsStatisticsService;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AnalyticsControllerTests {
    @Test
    void summaryEndpointUsesServiceResponse() {
        AnalyticsStatisticsService service = mock(AnalyticsStatisticsService.class);
        when(service.summary()).thenReturn(new AnalyticsSummaryResponse(0, 0, 0, 0.0));
        AnalyticsController controller = new AnalyticsController(service);

        assertEquals(0, controller.summary().totalRequests());
        assertEquals(List.of(), controller.routes());
    }
}
