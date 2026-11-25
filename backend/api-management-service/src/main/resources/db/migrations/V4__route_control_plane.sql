ALTER TABLE route_configuration_versions
    ADD COLUMN created_by VARCHAR(100);

ALTER TABLE api_routes
    ADD COLUMN description VARCHAR(1000),
    ADD COLUMN strip_prefix BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN deleted_at DATETIME(6),
    ADD COLUMN deleted BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE route_policies (
    id BIGINT NOT NULL AUTO_INCREMENT,
    route_pk BIGINT NOT NULL,
    authentication_required BOOLEAN NOT NULL,
    rate_limit_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    rate_limit_requests INTEGER,
    rate_limit_window_seconds INTEGER,
    rate_limit_scope VARCHAR(50),
    timeout_ms INTEGER NOT NULL,
    idempotency_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    rewrite_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    rewrite_target_prefix VARCHAR(500),
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    CONSTRAINT pk_route_policies PRIMARY KEY (id),
    CONSTRAINT uk_route_policies_route UNIQUE (route_pk),
    CONSTRAINT fk_route_policies_route FOREIGN KEY (route_pk) REFERENCES api_routes(id) ON DELETE CASCADE
);

CREATE TABLE route_policy_roles (
    policy_pk BIGINT NOT NULL,
    role_name VARCHAR(50) NOT NULL,
    CONSTRAINT pk_route_policy_roles PRIMARY KEY (policy_pk, role_name),
    CONSTRAINT fk_route_policy_roles_policy FOREIGN KEY (policy_pk) REFERENCES route_policies(id) ON DELETE CASCADE
);

CREATE INDEX idx_api_routes_org_active ON api_routes(organization_id, active, deleted);
CREATE INDEX idx_api_routes_path ON api_routes(path_pattern);
CREATE INDEX idx_route_versions_route ON route_configuration_versions(organization_id, route_id, version_number);
CREATE INDEX idx_audit_org_created ON control_plane_audit_records(organization_id, created_at);

CREATE TABLE route_configuration_outbox (
    id BIGINT NOT NULL AUTO_INCREMENT,
    event_id VARCHAR(36) NOT NULL,
    route_id VARCHAR(100) NOT NULL,
    organization_id BIGINT,
    configuration_version BIGINT NOT NULL,
    change_type VARCHAR(30) NOT NULL,
    payload_json LONGTEXT NOT NULL,
    status VARCHAR(20) NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error VARCHAR(2000),
    created_at DATETIME(6) NOT NULL,
    published_at DATETIME(6),
    CONSTRAINT pk_route_configuration_outbox PRIMARY KEY (id),
    CONSTRAINT uk_route_outbox_event UNIQUE (event_id)
);

CREATE INDEX idx_route_outbox_status ON route_configuration_outbox(status, created_at);
