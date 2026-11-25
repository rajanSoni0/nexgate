package in.rajan.nexgate.management.dto.responseDto;

import java.util.List;

public record RouteVersionComparisonResponse(long fromVersion, long toVersion, List<RouteVersionFieldDifference> differences) {}
