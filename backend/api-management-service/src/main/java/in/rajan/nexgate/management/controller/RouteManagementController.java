package in.rajan.nexgate.management.controller;

import in.rajan.nexgate.management.dto.requestDto.CompareVersionsRequest;
import in.rajan.nexgate.management.dto.requestDto.RouteRequest;
import in.rajan.nexgate.management.dto.requestDto.RouteStatusRequest;
import in.rajan.nexgate.management.dto.requestDto.RoutePolicyRequest;
import in.rajan.nexgate.management.dto.responseDto.RouteResponse;
import in.rajan.nexgate.management.dto.responseDto.RouteVersionComparisonResponse;
import in.rajan.nexgate.management.dto.responseDto.RouteVersionResponse;
import in.rajan.nexgate.management.service.RouteService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/gateway/admin/routes")
public class RouteManagementController {
    private final RouteService routeService;

    public RouteManagementController(RouteService routeService) {
        this.routeService = routeService;
    }

    @PostMapping
    public ResponseEntity<RouteResponse> create(@Valid @RequestBody RouteRequest request, Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED).body(routeService.create(request, authentication));
    }

    @GetMapping
    public Page<RouteResponse> list(@RequestParam(required = false) Boolean active,
                                    @PageableDefault(size = 20) Pageable pageable,
                                    Authentication authentication) {
        return routeService.list(active, pageable, authentication);
    }

    @GetMapping("/{id}")
    public RouteResponse get(@PathVariable Long id, Authentication authentication) {
        return routeService.get(id, authentication);
    }

    @PutMapping("/{id}")
    public RouteResponse update(@PathVariable Long id, @Valid @RequestBody RouteRequest request,
                                Authentication authentication) {
        return routeService.update(id, request, authentication);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Authentication authentication) {
        routeService.delete(id, authentication);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/status")
    public RouteResponse status(@PathVariable Long id, @Valid @RequestBody RouteStatusRequest request,
                               Authentication authentication) {
        return routeService.changeStatus(id, request, authentication);
    }

    @GetMapping("/{id}/policy")
    public RouteResponse policy(@PathVariable Long id, Authentication authentication) {
        return routeService.get(id, authentication);
    }

    @PutMapping("/{id}/policy")
    public RouteResponse policy(@PathVariable Long id, @Valid @RequestBody RoutePolicyRequest request,
                               Authentication authentication) {
        return routeService.updatePolicy(id, request, authentication);
    }

    @GetMapping("/{id}/versions")
    public List<RouteVersionResponse> history(@PathVariable Long id, Authentication authentication) {
        return routeService.history(id, authentication);
    }

    @GetMapping("/{id}/versions/{version}")
    public RouteVersionResponse version(@PathVariable Long id, @PathVariable long version,
                                        Authentication authentication) {
        return routeService.version(id, version, authentication);
    }

    @PostMapping("/{id}/versions/{version}/restore")
    public RouteResponse restore(@PathVariable Long id, @PathVariable long version,
                                 Authentication authentication) {
        return routeService.restore(id, version, authentication);
    }

    @GetMapping("/{id}/versions/compare")
    public RouteVersionComparisonResponse compare(@PathVariable Long id, @RequestParam long from, @RequestParam long to,
                                                  Authentication authentication) {
        return routeService.compareVersions(id, from, to, authentication);
    }
}
