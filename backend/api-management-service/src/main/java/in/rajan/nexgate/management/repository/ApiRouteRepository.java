package in.rajan.nexgate.management.repository;

import in.rajan.nexgate.management.entity.ApiRoute;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ApiRouteRepository extends JpaRepository<ApiRoute, Long> {
    boolean existsByOrganizationIdAndRouteIdAndDeletedFalse(Long organizationId, String routeId);
    Optional<ApiRoute> findByIdAndOrganizationIdAndDeletedFalse(Long id, Long organizationId);
    Optional<ApiRoute> findByOrganizationIdAndRouteIdAndDeletedFalse(Long organizationId, String routeId);
    Page<ApiRoute> findByOrganizationIdAndDeletedFalse(Long organizationId, Pageable pageable);
    Page<ApiRoute> findByDeletedFalse(Pageable pageable);
    Page<ApiRoute> findByOrganizationIdAndDeletedFalseAndActive(Long organizationId, boolean active, Pageable pageable);
    Page<ApiRoute> findByDeletedFalseAndActive(boolean active, Pageable pageable);
}
