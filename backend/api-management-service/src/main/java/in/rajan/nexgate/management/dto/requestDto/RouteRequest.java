package in.rajan.nexgate.management.dto.requestDto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.Set;

public record RouteRequest(
        Long organizationId,
        @NotBlank @Size(max = 100) String routeId,
        @NotBlank @Size(max = 200) String name,
        @Size(max = 1000) String description,
        @NotBlank @Size(max = 500) String pathPattern,
        @NotBlank @Size(max = 1000) String targetUri,
        boolean stripPrefix,
        @NotEmpty Set<String> allowedMethods,
        boolean active,
        @Valid RoutePolicyRequest policy,
        @Valid List<HeaderRuleRequest> headerRules
) {}
