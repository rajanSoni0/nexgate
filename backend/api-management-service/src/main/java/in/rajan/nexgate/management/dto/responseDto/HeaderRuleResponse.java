package in.rajan.nexgate.management.dto.responseDto;

import in.rajan.nexgate.management.entity.HeaderRuleAction;
import in.rajan.nexgate.management.entity.HeaderRuleDirection;

public record HeaderRuleResponse(Long id, HeaderRuleDirection direction, HeaderRuleAction action, String headerName, String headerValue) {}
