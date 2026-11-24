package in.rajan.nexgate.management;

import in.rajan.nexgate.management.entity.Organization;
import in.rajan.nexgate.management.entity.OrganizationStatus;
import in.rajan.nexgate.management.repository.OrganizationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.context.TestPropertySource;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.Instant;
import java.time.LocalDateTime;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:nexgateintegration;MODE=MySQL;DB_CLOSE_DELAY=-1",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.datasource.username=sa",
    "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.jpa.show-sql=true",
    "spring.flyway.enabled=false",
    "nexgate.outbox.publish-delay-ms=600000"
})
class RouteManagementIntegrationTests {
    @Autowired MockMvc mockMvc;
    @Autowired OrganizationRepository organizationRepository;
    @Autowired JdbcTemplate jdbcTemplate;

    private Organization org1;
    private Organization org2;

    @BeforeEach
    void setUp() {
        jdbcTemplate.execute("DELETE FROM route_configuration_outbox");
        jdbcTemplate.execute("DELETE FROM control_plane_audit_records");
        jdbcTemplate.execute("DELETE FROM route_configuration_versions");
        jdbcTemplate.execute("DELETE FROM route_header_rules");
        jdbcTemplate.execute("DELETE FROM route_policy_roles");
        jdbcTemplate.execute("DELETE FROM route_policies");
        jdbcTemplate.execute("DELETE FROM route_allowed_methods");
        jdbcTemplate.execute("DELETE FROM api_routes");
        jdbcTemplate.execute("DELETE FROM organizations");
        org1 = organization("Org One", "org-one");
        org2 = organization("Org Two", "org-two");
        organizationRepository.save(org1);
        organizationRepository.save(org2);
    }

    @Test
    void platformAdminCanCreateUpdateStatusPolicyAndRestoreRoute() throws Exception {
        String body = routeBody(org1.getId(), "catalog", "GET", true);
        String createResult = mockMvc.perform(post("/api/gateway/admin/routes")
                        .with(jwtPlatform())
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();

        long id = extractId(createResult);
        mockMvc.perform(patch("/api/gateway/admin/routes/{id}/status", id)
                        .with(jwtPlatform()).contentType(MediaType.APPLICATION_JSON).content("{\"active\":false}"))
                .andExpect(status().isOk());
        mockMvc.perform(put("/api/gateway/admin/routes/{id}/policy", id)
                        .with(jwtPlatform()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"authenticationRequired\":true,\"permittedRoles\":[\"TENANT_ADMIN\"],\"rateLimitEnabled\":true,\"rateLimitRequests\":50,\"rateLimitWindowSeconds\":60,\"rateLimitScope\":\"ROUTE\",\"timeoutMs\":5000,\"idempotencyEnabled\":false,\"rewriteEnabled\":true,\"rewriteTargetPrefix\":\"/catalog\"}"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/gateway/admin/routes/{id}/versions", id).with(jwtPlatform()))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/gateway/admin/routes/{id}/versions/1/restore", id).with(jwtPlatform()))
                .andExpect(status().isOk());
    }

    @Test
    void tenantCannotAccessAnotherOrganizationsRoute() throws Exception {
        String create = routeBody(org2.getId(), "cross-route", "GET", true);
        String result = mockMvc.perform(post("/api/gateway/admin/routes")
                        .with(jwtPlatform()).contentType(MediaType.APPLICATION_JSON).content(create))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long id = extractId(result);

        mockMvc.perform(get("/api/gateway/admin/routes/{id}", id).with(jwtTenant(org1.getId())))
                .andExpect(status().isForbidden());
    }

    @Test
    void unauthorizedAndInsufficientRoleRequestsAreSeparated() throws Exception {
        mockMvc.perform(get("/api/gateway/admin/routes")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/gateway/admin/routes")
                        .with(jwt().jwt(token -> token.subject("user")
                                .issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(300))
                                .claim("role", "USER"))))
                .andExpect(status().isForbidden());
    }

    private Organization organization(String name, String slug) {
        Organization organization = new Organization();
        organization.setName(name); organization.setSlug(slug);
        organization.setStatus(OrganizationStatus.ACTIVE); LocalDateTime now = LocalDateTime.now();
        organization.setCreatedAt(now); organization.setUpdatedAt(now); return organization;
    }

    private org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.JwtRequestPostProcessor jwtPlatform() {
        return jwt().authorities(new SimpleGrantedAuthority("ROLE_PLATFORM_ADMIN")).jwt(token ->
                token.subject("platform-admin").issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(300)).claim("role", "PLATFORM_ADMIN"));
    }

    private org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.JwtRequestPostProcessor jwtTenant(Long organizationId) {
        return jwt().authorities(new SimpleGrantedAuthority("ROLE_TENANT_ADMIN")).jwt(token ->
                token.subject("tenant-admin").issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(300)).claim("role", "TENANT_ADMIN").claim("organizationId", organizationId));
    }

    private String routeBody(Long organizationId, String routeId, String method, boolean active) {
        return "{\"organizationId\":" + organizationId + ",\"routeId\":\"" + routeId + "\",\"name\":\"Catalog\",\"pathPattern\":\"/catalog/**\",\"targetUri\":\"https://catalog.example\",\"stripPrefix\":true,\"allowedMethods\":[\"" + method + "\"],\"active\":" + active + ",\"policy\":{\"authenticationRequired\":true,\"permittedRoles\":[\"TENANT_ADMIN\"],\"rateLimitEnabled\":false,\"timeoutMs\":5000,\"idempotencyEnabled\":false,\"rewriteEnabled\":false},\"headerRules\":[]}";
    }

    private long extractId(String json) {
        int index = json.indexOf("\"id\":");
        int end = json.indexOf(',', index);
        if (end < 0) end = json.indexOf('}', index);
        return Long.parseLong(json.substring(index + 5, end).trim());
    }
}
