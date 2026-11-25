package in.rajan.nexgate.gateway.kafka;

import com.nexgate.common.events.ConfigurationChangeEvent;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.springframework.boot.autoconfigure.kafka.KafkaProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.support.serializer.JsonDeserializer;

import java.util.HashMap;
import java.util.Map;

@Configuration
public class KafkaConfiguration {
    @Bean
    public ConsumerFactory<String, ConfigurationChangeEvent> configurationConsumerFactory(KafkaProperties properties) {
        Map<String, Object> config = new HashMap<>(properties.buildConsumerProperties());
        JsonDeserializer<ConfigurationChangeEvent> valueDeserializer = new JsonDeserializer<>(ConfigurationChangeEvent.class);
        valueDeserializer.addTrustedPackages("com.nexgate.common.events");
        valueDeserializer.setUseTypeHeaders(false);
        return new DefaultKafkaConsumerFactory<>(config, new StringDeserializer(), valueDeserializer);
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, ConfigurationChangeEvent> kafkaListenerContainerFactory(
            ConsumerFactory<String, ConfigurationChangeEvent> consumerFactory) {
        ConcurrentKafkaListenerContainerFactory<String, ConfigurationChangeEvent> factory = new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(consumerFactory);
        return factory;
    }
}
