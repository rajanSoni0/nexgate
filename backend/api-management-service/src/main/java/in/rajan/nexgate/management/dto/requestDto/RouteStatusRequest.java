package in.rajan.nexgate.management.dto.requestDto;

import jakarta.validation.constraints.NotNull;

public record RouteStatusRequest(@NotNull Boolean active) {}
