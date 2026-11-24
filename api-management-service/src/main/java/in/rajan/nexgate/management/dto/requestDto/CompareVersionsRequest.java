package in.rajan.nexgate.management.dto.requestDto;

import jakarta.validation.constraints.NotNull;

public record CompareVersionsRequest(@NotNull Long from, @NotNull Long to) {}
