package in.rajan.nexgate.management.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

public class ManagementUser {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id")
    private Organization organization;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "role_id")
    private Role role;

    private String username;
    private String passwordHash;
    private boolean enabled;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;


}
