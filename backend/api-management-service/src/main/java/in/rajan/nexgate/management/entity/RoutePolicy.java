package in.rajan.nexgate.management.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "route_policies")
@Getter
@Setter
@NoArgsConstructor
public class RoutePolicy {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "route_pk", nullable = false, unique = true)
    private ApiRoute route;

    @Column(name = "authentication_required", nullable = false)
    private boolean authenticationRequired;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "route_policy_roles", joinColumns = @JoinColumn(name = "policy_pk"))
    @Column(name = "role_name", length = 50)
    private Set<String> permittedRoles = new HashSet<>();

    @Column(name = "rate_limit_enabled", nullable = false)
    private boolean rateLimitEnabled;

    @Column(name = "rate_limit_requests")
    private Integer rateLimitRequests;

    @Column(name = "rate_limit_window_seconds")
    private Integer rateLimitWindowSeconds;

    @Column(name = "rate_limit_scope", length = 50)
    private String rateLimitScope;

    @Column(name = "timeout_ms", nullable = false)
    private int timeoutMs;

    @Column(name = "idempotency_enabled", nullable = false)
    private boolean idempotencyEnabled;

    @Column(name = "rewrite_enabled", nullable = false)
    private boolean rewriteEnabled;

    @Column(name = "rewrite_target_prefix", length = 500)
    private String rewriteTargetPrefix;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
