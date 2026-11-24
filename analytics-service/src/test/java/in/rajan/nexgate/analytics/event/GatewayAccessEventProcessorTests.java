package in.rajan.nexgate.analytics.event;

import com.nexgate.common.events.GatewayAccessEvent;
import in.rajan.nexgate.analytics.mongodb.GatewayAccessRecord;
import in.rajan.nexgate.analytics.mongodb.GatewayAccessRecordRepository;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class GatewayAccessEventProcessorTests {
    private GatewayAccessEvent event() {
        return new GatewayAccessEvent("event-1", "corr-1", 7L, "orders", "/orders",
                "POST", 201, "FORWARDING_SUCCESS", 12, false, false, Instant.now());
    }

    @Test
    void persistsNewEvent() {
        GatewayAccessRecordRepository repository = mock(GatewayAccessRecordRepository.class);
        when(repository.findByEventId("event-1")).thenReturn(Optional.empty());
        GatewayAccessEventProcessor processor = new GatewayAccessEventProcessor(repository);

        assertTrue(processor.process(event()));
        verify(repository).save(any(GatewayAccessRecord.class));
    }

    @Test
    void duplicateEventIsNotPersistedTwice() {
        GatewayAccessRecordRepository repository = mock(GatewayAccessRecordRepository.class);
        GatewayAccessRecord existing = mock(GatewayAccessRecord.class);
        when(repository.findByEventId("event-1")).thenReturn(Optional.of(existing));
        GatewayAccessEventProcessor processor = new GatewayAccessEventProcessor(repository);

        assertFalse(processor.process(event()));
        verify(repository, never()).save(any(GatewayAccessRecord.class));
    }
}
