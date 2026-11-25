package in.rajan.nexgate.management.repository;

import in.rajan.nexgate.management.entity.RouteConfigurationVersion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RouteConfigurationVersionRepository extends JpaRepository<RouteConfigurationVersion, Long> {
    List<RouteConfigurationVersion> findByOrganizationIdAndRouteIdOrderByVersionNumberDesc(Long organizationId, String routeId);
    Optional<RouteConfigurationVersion> findByOrganizationIdAndRouteIdAndVersionNumber(Long organizationId, String routeId, long versionNumber);
    Optional<RouteConfigurationVersion> findTopByOrganizationIdAndRouteIdOrderByVersionNumberDesc(Long organizationId, String routeId);
}
