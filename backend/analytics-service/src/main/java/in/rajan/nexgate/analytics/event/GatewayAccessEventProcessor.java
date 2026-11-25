package in.rajan.nexgate.analytics.event;

import com.nexgate.common.events.GatewayAccessEvent;
import in.rajan.nexgate.analytics.mongodb.GatewayAccessRecord;
import in.rajan.nexgate.analytics.mongodb.GatewayAccessRecordRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class GatewayAccessEventProcessor {
    private static final Logger log = LoggerFactory.getLogger(GatewayAccessEventProcessor.class);
    private final GatewayAccessRecordRepository repository;

    public GatewayAccessEventProcessor(GatewayAccessRecordRepository repository) {
        this.repository = repository;
    }

    public boolean process(GatewayAccessEvent event) {
        if (event == null || event.eventId() == null || event.eventId().isBlank()) {
            log.warn("Rejected access event without eventId");
            return false;
        }
        if (repository.findByEventId(event.eventId()).isPresent()) return false;

        GatewayAccessRecord record = new GatewayAccessRecord(null, event.eventId(), event.correlationId(),
                event.organizationId(), event.routeId(), event.routePath(), event.httpMethod(), event.status(),
                event.outcome(), event.durationMs(), event.rateLimitRejected(), event.idempotencyReplay(),
                event.timestamp(), Instant.now());
        repository.save(record);
        return true;
    }
}
