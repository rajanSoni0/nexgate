package in.rajan.nexgate.gateway.correlation;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;
import java.util.regex.Pattern;

@Component
@EnableConfigurationProperties(CorrelationProperties.class)
public class CorrelationIdFilter extends OncePerRequestFilter {
    private static final Pattern VALID = Pattern.compile("^[A-Za-z0-9._~-]{1,128}$");
    private final CorrelationProperties properties;

    public CorrelationIdFilter(CorrelationProperties properties) {
        this.properties = properties;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String incoming = request.getHeader(properties.headerName());
        String correlationId = incoming != null && VALID.matcher(incoming).matches()
                && incoming.length() <= properties.maxLength() ? incoming : UUID.randomUUID().toString();
        request.setAttribute("nexgate.correlationId", correlationId);
        response.setHeader(properties.headerName(), correlationId);
        filterChain.doFilter(request, response);
    }
}
