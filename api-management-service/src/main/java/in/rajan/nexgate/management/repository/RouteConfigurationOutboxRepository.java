package in.rajan.nexgate.management.repository;

import in.rajan.nexgate.management.entity.OutboxStatus;
import in.rajan.nexgate.management.entity.RouteConfigurationOutbox;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RouteConfigurationOutboxRepository extends JpaRepository<RouteConfigurationOutbox, Long> {
    List<RouteConfigurationOutbox> findTop100ByStatusOrderByCreatedAtAsc(OutboxStatus status);
}
