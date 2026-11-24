package in.rajan.nexgate.management.dto.responseDto;

import java.time.LocalDateTime;

public record RouteVersionResponse(Long id, String routeId, long versionNumber, String changeType, String configurationSnapshot, String createdBy, LocalDateTime createdAt) {}
