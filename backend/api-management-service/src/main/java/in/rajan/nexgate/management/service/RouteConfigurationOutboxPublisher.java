package in.rajan.nexgate.management.service;

import in.rajan.nexgate.management.entity.OutboxStatus;
import in.rajan.nexgate.management.entity.RouteConfigurationOutbox;
import in.rajan.nexgate.management.repository.RouteConfigurationOutboxRepository;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class RouteConfigurationOutboxPublisher {
    public static final String TOPIC = "gateway-configuration-events";

    private final RouteConfigurationOutboxRepository repository;
    private final KafkaTemplate<String, String> kafkaTemplate;

    public RouteConfigurationOutboxPublisher(RouteConfigurationOutboxRepository repository,
                                             KafkaTemplate<String, String> kafkaTemplate) {
        this.repository = repository;
        this.kafkaTemplate = kafkaTemplate;
    }

    @Scheduled(fixedDelayString = "${nexgate.outbox.publish-delay-ms:5000}")
    @Transactional
    public void publishPending() {
        for (RouteConfigurationOutbox event : repository.findTop100ByStatusOrderByCreatedAtAsc(OutboxStatus.PENDING)) {
            event.setAttempts(event.getAttempts() + 1);
            try {
                kafkaTemplate.send(TOPIC, event.getRouteId(), event.getPayloadJson()).get();
                event.setStatus(OutboxStatus.PUBLISHED);
                event.setPublishedAt(LocalDateTime.now());
                event.setLastError(null);
            } catch (Exception ex) {
                event.setStatus(event.getAttempts() >= 10 ? OutboxStatus.FAILED : OutboxStatus.PENDING);
                event.setLastError(ex.getMessage());
            }
        }
    }
}
