package in.rajan.nexgate.gateway.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Authentication and authorization for proxied traffic are enforced per route by
 * RouteAuthorizationService (route policy + JWT roles). Spring Security's default Basic-auth
 * chain would otherwise reject every request before the gateway pipeline runs, so the servlet
 * chain is stateless and permissive, with no Basic/form login and no session.
 */
@Configuration
public class GatewaySecurityConfiguration {
    @Bean
    public SecurityFilterChain gatewaySecurityFilterChain(HttpSecurity http) throws Exception {
        http.csrf(csrf -> csrf.disable())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .httpBasic(basic -> basic.disable())
                .formLogin(form -> form.disable())
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
        return http.build();
    }
}
