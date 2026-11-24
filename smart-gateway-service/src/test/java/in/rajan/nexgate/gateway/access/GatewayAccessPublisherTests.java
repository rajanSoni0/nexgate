package in.rajan.nexgate.gateway.access;

import com.nexgate.common.events.GatewayAccessEvent;
import org.junit.jupiter.api.Test;
import org.springframework.kafka.core.KafkaTemplate;

import java.time.Instant;
import java.util.concurrent.CompletableFuture;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class GatewayAccessPublisherTests {
    @SuppressWarnings({"unchecked", "rawtypes"})
    @Test
    void publishesEventAsynchronouslyWithoutWaitingForResult() {
        KafkaTemplate<String, GatewayAccessEvent> kafkaTemplate = mock(KafkaTemplate.class);
        when(kafkaTemplate.send(anyString(), anyString(), any())).thenReturn((CompletableFuture) CompletableFuture.completedFuture(null));
        GatewayAccessPublisher publisher = new GatewayAccessPublisher(kafkaTemplate);
        GatewayAccessEvent event = new GatewayAccessEvent("event-1", "corr-1", 7L, "orders", "/orders",
                "POST", 201, "FORWARDING_SUCCESS", 12, false, false, Instant.now());

        publisher.publish(event);

        verify(kafkaTemplate).send(GatewayAccessPublisher.TOPIC, "orders", event);
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    @Test
    void producerFailureIsHandledWithoutThrowing() {
        KafkaTemplate<String, GatewayAccessEvent> kafkaTemplate = mock(KafkaTemplate.class);
        when(kafkaTemplate.send(anyString(), anyString(), any())).thenReturn((CompletableFuture) CompletableFuture.failedFuture(new RuntimeException("Kafka unavailable")));
        GatewayAccessPublisher publisher = new GatewayAccessPublisher(kafkaTemplate);
        GatewayAccessEvent event = new GatewayAccessEvent("event-2", "corr-2", 7L, "orders", "/orders",
                "POST", 201, "FORWARDING_SUCCESS", 12, false, false, Instant.now());

        publisher.publish(event);
    }
}
