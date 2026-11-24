package in.rajan.nexgate.gateway.access;

import com.nexgate.common.events.GatewayAccessEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
public class GatewayAccessPublisher {
    public static final String TOPIC = "gateway-access-events";
    private static final Logger log = LoggerFactory.getLogger(GatewayAccessPublisher.class);
    private final KafkaTemplate<String, GatewayAccessEvent> kafkaTemplate;

    public GatewayAccessPublisher(KafkaTemplate<String, GatewayAccessEvent> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void publish(GatewayAccessEvent event) {
        try {
            kafkaTemplate.send(TOPIC, event.routeId(), event).whenComplete((result, ex) -> {
                if (ex != null) log.warn("Access event publish failed eventId={} routeId={}",
                        event.eventId(), event.routeId());
            });
        } catch (RuntimeException ex) {
            log.warn("Access event publish could not be scheduled eventId={} routeId={}",
                    event.eventId(), event.routeId());
        }
    }
}
