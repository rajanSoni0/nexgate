package in.rajan.nexgate.management.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "route_header_rules")
@Getter
@Setter
@NoArgsConstructor
public class RouteHeaderRule {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "route_pk", nullable = false)
    private ApiRoute route;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private HeaderRuleDirection direction;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private HeaderRuleAction action;

    @Column(name = "header_name", nullable = false, length = 200)
    private String headerName;

    @Column(name = "header_value", length = 2000)
    private String headerValue;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
