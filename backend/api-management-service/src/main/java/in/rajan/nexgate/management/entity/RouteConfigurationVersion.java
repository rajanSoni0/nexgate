package in.rajan.nexgate.management.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "route_configuration_versions")
@Getter
@Setter
@NoArgsConstructor
public class RouteConfigurationVersion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @Column(name = "route_id", nullable = false, length = 100)
    private String routeId;

    @Column(name = "version_number", nullable = false)
    private long versionNumber;

    @Column(name = "change_type", nullable = false, length = 30)
    private String changeType;

    @Column(name = "configuration_snapshot", nullable = false, columnDefinition = "LONGTEXT")
    private String configurationSnapshot;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
