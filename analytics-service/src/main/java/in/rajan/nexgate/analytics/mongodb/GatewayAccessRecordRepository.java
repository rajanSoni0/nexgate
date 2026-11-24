package in.rajan.nexgate.analytics.mongodb;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface GatewayAccessRecordRepository extends MongoRepository<GatewayAccessRecord, String> {
    Optional<GatewayAccessRecord> findByEventId(String eventId);
}
