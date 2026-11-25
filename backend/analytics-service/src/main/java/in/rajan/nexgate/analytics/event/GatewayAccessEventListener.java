package in.rajan.nexgate.analytics.event;

import com.nexgate.common.events.GatewayAccessEvent;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class GatewayAccessEventListener {
    private final GatewayAccessEventProcessor processor;

    public GatewayAccessEventListener(GatewayAccessEventProcessor processor) {
        this.processor = processor;
    }

    @KafkaListener(topics = "gateway-access-events", groupId = "nexgate-analytics")
    public void consume(GatewayAccessEvent event) {
        processor.process(event);
    }
}
