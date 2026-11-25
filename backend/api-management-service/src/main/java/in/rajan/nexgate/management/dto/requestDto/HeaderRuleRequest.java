package in.rajan.nexgate.management.dto.requestDto;

import in.rajan.nexgate.management.entity.HeaderRuleAction;
import in.rajan.nexgate.management.entity.HeaderRuleDirection;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record HeaderRuleRequest(
        @NotNull HeaderRuleDirection direction,
        @NotNull HeaderRuleAction action,
        @NotBlank @Size(max = 200) String headerName,
        @Size(max = 2000) String headerValue
) {}
