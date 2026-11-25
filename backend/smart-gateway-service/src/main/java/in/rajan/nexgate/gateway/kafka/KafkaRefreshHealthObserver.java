package in.rajan.nexgate.gateway.kafka;

import in.rajan.nexgate.gateway.configuration.ConfigurationRefreshState;
import org.springframework.context.event.EventListener;
import org.springframework.kafka.event.ConsumerFailedToStartEvent;
import org.springframework.kafka.event.ConsumerStoppedEvent;
import org.springframework.stereotype.Component;

@Component
public class KafkaRefreshHealthObserver {
    private final ConfigurationRefreshState state;

    public KafkaRefreshHealthObserver(ConfigurationRefreshState state) {
        this.state = state;
    }

    @EventListener
    public void consumerFailed(ConsumerFailedToStartEvent event) {
        state.degraded("Kafka configuration consumer could not start");
    }

    @EventListener
    public void consumerStopped(ConsumerStoppedEvent event) {
        state.degraded("Kafka configuration consumer stopped");
    }
}
