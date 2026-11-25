package in.rajan.nexgate.management.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "route_configuration_outbox")
@Getter
@Setter
@NoArgsConstructor
public class RouteConfigurationOutbox {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_id", nullable = false, length = 36)
    private String eventId;

    @Column(name = "route_id", nullable = false, length = 100)
    private String routeId;

    @Column(name = "organization_id")
    private Long organizationId;

    @Column(name = "configuration_version", nullable = false)
    private long configurationVersion;

    @Column(name = "change_type", nullable = false, length = 30)
    private String changeType;

    @Column(name = "payload_json", nullable = false, columnDefinition = "LONGTEXT")
    private String payloadJson;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OutboxStatus status;

    @Column(nullable = false)
    private int attempts;

    @Column(name = "last_error", length = 2000)
    private String lastError;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;
}
