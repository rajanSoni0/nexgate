package in.rajan.nexgate.analytics.config;

import com.nexgate.common.events.GatewayAccessEvent;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.springframework.boot.autoconfigure.kafka.KafkaProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.support.serializer.JsonDeserializer;

import java.util.HashMap;
import java.util.Map;

@Configuration
public class AnalyticsKafkaConfiguration {
    @Bean
    public ConsumerFactory<String, GatewayAccessEvent> accessEventConsumerFactory(KafkaProperties properties) {
        Map<String, Object> config = new HashMap<>(properties.buildConsumerProperties());
        config.put(org.apache.kafka.clients.consumer.ConsumerConfig.GROUP_ID_CONFIG, "nexgate-analytics");
        JsonDeserializer<GatewayAccessEvent> deserializer = new JsonDeserializer<>(GatewayAccessEvent.class);
        deserializer.addTrustedPackages("com.nexgate.common.events");
        deserializer.setUseTypeHeaders(false);
        return new DefaultKafkaConsumerFactory<>(config, new StringDeserializer(), deserializer);
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, GatewayAccessEvent> kafkaListenerContainerFactory(
            ConsumerFactory<String, GatewayAccessEvent> accessEventConsumerFactory) {
        ConcurrentKafkaListenerContainerFactory<String, GatewayAccessEvent> factory = new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(accessEventConsumerFactory);
        return factory;
    }
}
