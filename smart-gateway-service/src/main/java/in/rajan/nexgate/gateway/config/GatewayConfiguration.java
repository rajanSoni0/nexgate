package in.rajan.nexgate.gateway.config;

import in.rajan.nexgate.gateway.configuration.ManagementProperties;
import in.rajan.nexgate.gateway.routing.RouteRegistry;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;
import in.rajan.nexgate.gateway.proxy.*;
import java.net.http.HttpClient;
import java.time.Duration;
import in.rajan.nexgate.gateway.security.*;
import in.rajan.nexgate.gateway.policy.*;
import org.springframework.data.redis.core.StringRedisTemplate;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@Configuration
@EnableConfigurationProperties({ManagementProperties.class, GatewayJwtProperties.class,
        RateLimitProperties.class, IdempotencyProperties.class})
public class GatewayConfiguration {
    @Bean
    public RouteRegistry routeRegistry() {
        return new RouteRegistry();
    }

    @Bean
    public RestClient managementRestClient(RestClient.Builder builder) {
        return builder.build();
    }

    @Bean
    public PathTransformer pathTransformer() {
        return new PathTransformer();
    }

    @Bean
    public HeaderTransformer headerTransformer() {
        return new HeaderTransformer();
    }

    @Bean
    public HttpClient downstreamHttpClient() {
        return HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .followRedirects(HttpClient.Redirect.NEVER)
                .build();
    }

    @Bean
    public GatewayJwtValidator gatewayJwtValidator(GatewayJwtProperties properties) {
        return new GatewayJwtValidator(properties);
    }

    @Bean
    public RouteAuthorizationService routeAuthorizationService(GatewayJwtValidator validator) {
        return new RouteAuthorizationService(validator);
    }

    @Bean
    public RedisRateLimiter redisRateLimiter(StringRedisTemplate stringRedisTemplate) {
        return new RedisRateLimiter(stringRedisTemplate);
    }

    @Bean
    public RouteRateLimitService routeRateLimitService(RedisRateLimiter redisRateLimiter) {
        return new RouteRateLimitService(redisRateLimiter);
    }

    @Bean
    public RedisIdempotencyService redisIdempotencyService(StringRedisTemplate stringRedisTemplate,
                                                           ObjectMapper objectMapper,
                                                           IdempotencyProperties properties) {
        return new RedisIdempotencyService(stringRedisTemplate, objectMapper, properties);
    }

    @Bean
    public HttpProxyForwarder httpProxyForwarder(HttpClient downstreamHttpClient,
                                                PathTransformer pathTransformer,
                                                HeaderTransformer headerTransformer) {
        return new HttpProxyForwarder(downstreamHttpClient, pathTransformer, headerTransformer);
    }
}
