package in.rajan.nexgate.gateway.configuration;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

@Component
public class ConfigurationRefreshState {
    private final AtomicReference<Instant> lastSuccessfulRefresh = new AtomicReference<>();
    private final AtomicReference<Boolean> initialized = new AtomicReference<>(false);
    private final AtomicReference<String> status = new AtomicReference<>("INITIALIZING");
    private final AtomicReference<String> message = new AtomicReference<>("Loading routes");
    private final AtomicInteger activeRouteCount = new AtomicInteger();

    public void initialized(int count) {
        initialized.set(true); activeRouteCount.set(count); lastSuccessfulRefresh.set(Instant.now());
        status.set("READY"); message.set("Last known-good configuration is active");
    }

    public void refreshed(int count) { initialized(count); }

    public void degraded(String reason) {
        status.set("DEGRADED"); message.set(reason);
    }

    public void setActiveRouteCount(int count) { activeRouteCount.set(count); }

    public ConfigurationRefreshStatus snapshot() {
        return new ConfigurationRefreshStatus(initialized.get(), activeRouteCount.get(), lastSuccessfulRefresh.get(), status.get(), message.get());
    }
}
