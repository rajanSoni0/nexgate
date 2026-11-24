package in.rajan.nexgate.management;

import in.rajan.nexgate.management.entity.OutboxStatus;
import in.rajan.nexgate.management.entity.RouteConfigurationOutbox;
import in.rajan.nexgate.management.repository.RouteConfigurationOutboxRepository;
import in.rajan.nexgate.management.service.RouteConfigurationOutboxPublisher;
import org.junit.jupiter.api.Test;
import org.springframework.kafka.core.KafkaTemplate;

import java.util.List;
import java.util.concurrent.CompletableFuture;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@SuppressWarnings({"unchecked", "rawtypes"})
class RouteConfigurationOutboxPublisherTests {
    @Test
    void marksPublishedAfterSuccessfulSend() {
        RouteConfigurationOutboxRepository repository = mock(RouteConfigurationOutboxRepository.class);
        KafkaTemplate<String, String> kafkaTemplate = mock(KafkaTemplate.class);
        RouteConfigurationOutbox event = new RouteConfigurationOutbox();
        event.setRouteId("catalog"); event.setPayloadJson("{}"); event.setStatus(OutboxStatus.PENDING); event.setAttempts(0);
        when(repository.findTop100ByStatusOrderByCreatedAtAsc(OutboxStatus.PENDING)).thenReturn(List.of(event));
        when(kafkaTemplate.send(anyString(), anyString(), anyString())).thenReturn((CompletableFuture) CompletableFuture.completedFuture(null));

        new RouteConfigurationOutboxPublisher(repository, kafkaTemplate).publishPending();

        assertEquals(OutboxStatus.PUBLISHED, event.getStatus());
        verify(kafkaTemplate).send(RouteConfigurationOutboxPublisher.TOPIC, "catalog", "{}");
    }

    @Test
    void keepsEventPendingAfterRetryableFailure() {
        RouteConfigurationOutboxRepository repository = mock(RouteConfigurationOutboxRepository.class);
        KafkaTemplate<String, String> kafkaTemplate = mock(KafkaTemplate.class);
        RouteConfigurationOutbox event = new RouteConfigurationOutbox();
        event.setRouteId("orders"); event.setPayloadJson("{}"); event.setStatus(OutboxStatus.PENDING); event.setAttempts(2);
        when(repository.findTop100ByStatusOrderByCreatedAtAsc(OutboxStatus.PENDING)).thenReturn(List.of(event));
        when(kafkaTemplate.send(anyString(), anyString(), anyString()))
                .thenReturn((CompletableFuture) CompletableFuture.failedFuture(new RuntimeException("broker unavailable")));

        new RouteConfigurationOutboxPublisher(repository, kafkaTemplate).publishPending();

        assertEquals(OutboxStatus.PENDING, event.getStatus());
        assertEquals(3, event.getAttempts());
        assertTrue(event.getLastError().contains("broker unavailable"));
    }

    @Test
    void marksEventFailedAfterExhaustedRetries() {
        RouteConfigurationOutboxRepository repository = mock(RouteConfigurationOutboxRepository.class);
        KafkaTemplate<String, String> kafkaTemplate = mock(KafkaTemplate.class);
        RouteConfigurationOutbox event = new RouteConfigurationOutbox();
        event.setRouteId("orders"); event.setPayloadJson("{}"); event.setStatus(OutboxStatus.PENDING); event.setAttempts(9);
        when(repository.findTop100ByStatusOrderByCreatedAtAsc(OutboxStatus.PENDING)).thenReturn(List.of(event));
        when(kafkaTemplate.send(anyString(), anyString(), anyString()))
                .thenReturn((CompletableFuture) CompletableFuture.failedFuture(new RuntimeException("broker unavailable")));

        new RouteConfigurationOutboxPublisher(repository, kafkaTemplate).publishPending();

        assertEquals(OutboxStatus.FAILED, event.getStatus());
        assertEquals(10, event.getAttempts());
    }

    @Test
    void publisherExceptionDoesNotExposeOrThrowToRouteTransaction() {
        RouteConfigurationOutboxRepository repository = mock(RouteConfigurationOutboxRepository.class);
        KafkaTemplate<String, String> kafkaTemplate = mock(KafkaTemplate.class);
        RouteConfigurationOutbox event = new RouteConfigurationOutbox();
        event.setRouteId("catalog"); event.setPayloadJson("{}"); event.setStatus(OutboxStatus.PENDING); event.setAttempts(0);
        when(repository.findTop100ByStatusOrderByCreatedAtAsc(OutboxStatus.PENDING)).thenReturn(List.of(event));
        when(kafkaTemplate.send(anyString(), anyString(), anyString())).thenThrow(new RuntimeException("Kafka unavailable"));

        new RouteConfigurationOutboxPublisher(repository, kafkaTemplate).publishPending();

        assertEquals(OutboxStatus.PENDING, event.getStatus());
        assertEquals("Kafka unavailable", event.getLastError());
    }
}
