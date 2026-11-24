package in.rajan.nexgate.management.controller;

import in.rajan.nexgate.management.dto.responseDto.RouteResponse;
import in.rajan.nexgate.management.service.RouteService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/gateway/routes")
public class GatewayConfigurationController {
    private final RouteService routeService;

    public GatewayConfigurationController(RouteService routeService) {
        this.routeService = routeService;
    }

    @GetMapping
    public java.util.List<RouteResponse> activeRoutes(Authentication authentication) {
        return routeService.findAllActiveForGateway();
    }
}
