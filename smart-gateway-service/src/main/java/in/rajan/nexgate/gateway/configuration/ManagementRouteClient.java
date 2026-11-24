package in.rajan.nexgate.gateway.configuration;

import in.rajan.nexgate.gateway.dto.GatewayRouteConfiguration;
import in.rajan.nexgate.gateway.dto.ManagementLoginRequest;
import in.rajan.nexgate.gateway.dto.ManagementLoginResponse;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;

@Component
public class ManagementRouteClient {
    private final RestClient restClient;
    private final ManagementProperties properties;

    public ManagementRouteClient(RestClient managementRestClient, ManagementProperties properties) {
        this.restClient = managementRestClient;
        this.properties = properties;
    }

    public List<GatewayRouteConfiguration> fetchActiveRoutes() {
        ManagementLoginResponse login = restClient.post()
                .uri(properties.baseUrl() + "/api/auth/login")
                .body(new ManagementLoginRequest(properties.username(), properties.password()))
                .retrieve()
                .body(ManagementLoginResponse.class);
        if (login == null || login.token() == null || login.token().isBlank()) {
            throw new IllegalStateException("API Management login did not return a JWT");
        }

        GatewayRouteConfiguration[] routes = restClient.get()
                .uri(properties.baseUrl() + "/api/gateway/routes")
                .header("Authorization", "Bearer " + login.token())
                .retrieve()
                .body(GatewayRouteConfiguration[].class);
        return routes == null ? List.of() : List.of(routes);
    }
}
