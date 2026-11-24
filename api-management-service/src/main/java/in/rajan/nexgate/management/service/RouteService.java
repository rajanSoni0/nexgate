package in.rajan.nexgate.management.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexgate.common.events.ConfigurationChangeEvent;
import in.rajan.nexgate.management.audit.Audited;
import in.rajan.nexgate.management.dto.requestDto.*;
import in.rajan.nexgate.management.dto.responseDto.*;
import in.rajan.nexgate.management.entity.*;
import in.rajan.nexgate.management.exception.ApiException;
import in.rajan.nexgate.management.repository.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class RouteService {
    private final ApiRouteRepository routeRepository;
    private final OrganizationRepository organizationRepository;
    private final RouteConfigurationVersionRepository versionRepository;
    private final RouteConfigurationOutboxRepository outboxRepository;
    private final RoutePolicyValidator validator;
    private final TenantAuthorizationService tenantAuthorization;
    private final ObjectMapper objectMapper;
    private final RouteVersionComparisonService comparisonService;

    public RouteService(ApiRouteRepository routeRepository, OrganizationRepository organizationRepository,
                        RouteConfigurationVersionRepository versionRepository,
                        RouteConfigurationOutboxRepository outboxRepository,
                        RoutePolicyValidator validator, TenantAuthorizationService tenantAuthorization,
                        ObjectMapper objectMapper, RouteVersionComparisonService comparisonService) {
        this.routeRepository = routeRepository;
        this.organizationRepository = organizationRepository;
        this.versionRepository = versionRepository;
        this.outboxRepository = outboxRepository;
        this.validator = validator;
        this.tenantAuthorization = tenantAuthorization;
        this.objectMapper = objectMapper;
        this.comparisonService = comparisonService;
    }

    @Audited(action = "CREATE_ROUTE", resourceType = "ROUTE")
    @Transactional
    public RouteResponse create(RouteRequest request, Authentication authentication) {
        validator.validate(request);
        Long organizationId = tenantAuthorization.organizationId(authentication);
        if (organizationId == null) {
            organizationId = request.organizationId();
        } else if (request.organizationId() != null && !organizationId.equals(request.organizationId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Cross-tenant access is not permitted");
        }
        if (organizationId == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Organization ID is required for route creation");
        }
        Organization organization = organizationRepository.findByIdAndStatusNot(organizationId, OrganizationStatus.DELETED)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Organization not found"));
        if (routeRepository.existsByOrganizationIdAndRouteIdAndDeletedFalse(organizationId, request.routeId())) {
            throw new ApiException(HttpStatus.CONFLICT, "Route identifier already exists");
        }

        LocalDateTime now = LocalDateTime.now();
        ApiRoute route = apply(new ApiRoute(), organization, request, now);
        route.setConfigurationVersion(1);
        routeRepository.save(route);
        persistVersion(route, "CREATE", actor(authentication), now);
        addOutbox(route, "CREATE");
        return response(route);
    }

    @Transactional(readOnly = true)
    public Page<RouteResponse> list(Boolean active, Pageable pageable, Authentication authentication) {
        Long organizationId = tenantAuthorization.organizationId(authentication);
        Page<ApiRoute> routes;
        if (organizationId == null) {
            routes = active == null
                    ? routeRepository.findByDeletedFalse(pageable)
                    : routeRepository.findByDeletedFalseAndActive(active, pageable);
        } else {
            routes = active == null
                    ? routeRepository.findByOrganizationIdAndDeletedFalse(organizationId, pageable)
                    : routeRepository.findByOrganizationIdAndDeletedFalseAndActive(organizationId, active, pageable);
        }

        return routes.map(this::response);
    }

    @Transactional(readOnly = true)
    public List<RouteResponse> findAllActiveForGateway() {
        return routeRepository.findByDeletedFalseAndActive(true, Pageable.unpaged()).getContent().stream()
                .map(this::response).toList();
    }

    @Transactional(readOnly = true)
    public RouteResponse get(Long id, Authentication authentication) {
        ApiRoute route = getAccessibleRoute(id, authentication);
        return response(route);
    }

    @Audited(action = "UPDATE_ROUTE", resourceType = "ROUTE")
    @Transactional
    public RouteResponse update(Long id, RouteRequest request, Authentication authentication) {
        validator.validate(request);
        ApiRoute route = getAccessibleRoute(id, authentication);
        if (!route.getRouteId().equals(request.routeId())
                && routeRepository.existsByOrganizationIdAndRouteIdAndDeletedFalse(route.getOrganization().getId(), request.routeId())) {
            throw new ApiException(HttpStatus.CONFLICT, "Route identifier already exists");
        }
        LocalDateTime now = LocalDateTime.now();
        apply(route, route.getOrganization(), request, now);
        route.setConfigurationVersion(route.getConfigurationVersion() + 1);
        routeRepository.save(route);
        persistVersion(route, "UPDATE", actor(authentication), now);
        addOutbox(route, "UPDATE");
        return response(route);
    }

    @Audited(action = "CHANGE_ROUTE_STATUS", resourceType = "ROUTE")
    @Transactional
    public RouteResponse changeStatus(Long id, RouteStatusRequest request, Authentication authentication) {
        ApiRoute route = getAccessibleRoute(id, authentication);
        route.setActive(request.active());
        route.setUpdatedAt(LocalDateTime.now());
        route.setConfigurationVersion(route.getConfigurationVersion() + 1);
        persistVersion(route, request.active() ? "ACTIVATE" : "DEACTIVATE", actor(authentication), route.getUpdatedAt());
        addOutbox(route, request.active() ? "ACTIVATE" : "DEACTIVATE");
        return response(route);
    }

    @Audited(action = "DELETE_ROUTE", resourceType = "ROUTE")
    @Transactional
    public void delete(Long id, Authentication authentication) {
        ApiRoute route = getAccessibleRoute(id, authentication);
        route.setDeleted(true);
        route.setActive(false);
        route.setDeletedAt(LocalDateTime.now());
        route.setUpdatedAt(route.getDeletedAt());
        route.setConfigurationVersion(route.getConfigurationVersion() + 1);
        persistVersion(route, "DELETE", actor(authentication), route.getUpdatedAt());
        addOutbox(route, "DELETE");
    }

    @Audited(action = "UPDATE_ROUTE_POLICY", resourceType = "ROUTE_POLICY")
    @Transactional
    public RouteResponse updatePolicy(Long id, RoutePolicyRequest request, Authentication authentication) {
        ApiRoute route = getAccessibleRoute(id, authentication);
        RouteRequest effective = new RouteRequest(route.getOrganization().getId(), route.getRouteId(), route.getName(), route.getDescription(),
                route.getPathPattern(), route.getTargetUri(), route.isStripPrefix(), route.getAllowedMethods(),
                route.isActive(), request, headerRequests(route));
        validator.validate(effective);
        applyPolicy(route, request);
        LocalDateTime now = LocalDateTime.now();
        route.setUpdatedAt(now);
        route.setConfigurationVersion(route.getConfigurationVersion() + 1);
        persistVersion(route, "POLICY_UPDATE", actor(authentication), now);
        addOutbox(route, "POLICY_UPDATE");
        return response(route);
    }

    @Transactional(readOnly = true)
    public List<RouteVersionResponse> history(Long id, Authentication authentication) {
        ApiRoute route = getAccessibleRoute(id, authentication);
        return versionRepository.findByOrganizationIdAndRouteIdOrderByVersionNumberDesc(
                        route.getOrganization().getId(), route.getRouteId()).stream().map(this::versionResponse).toList();
    }

    @Transactional(readOnly = true)
    public RouteVersionComparisonResponse compareVersions(Long id, long fromVersion, long toVersion, Authentication authentication) {
        RouteRequest from = snapshot(id, fromVersion, authentication);
        RouteRequest to = snapshot(id, toVersion, authentication);
        return new RouteVersionComparisonResponse(fromVersion, toVersion, comparisonService.compare(from, to));
    }

    private RouteRequest snapshot(Long id, long version, Authentication authentication) {
        ApiRoute route = getAccessibleRoute(id, authentication);
        RouteConfigurationVersion stored = versionRepository.findByOrganizationIdAndRouteIdAndVersionNumber(
                route.getOrganization().getId(), route.getRouteId(), version).orElse(null);
        if (stored == null) throw new ApiException(HttpStatus.NOT_FOUND, "Route version not found");
        try {
            return objectMapper.readValue(stored.getConfigurationSnapshot(), RouteRequest.class);
        } catch (JsonProcessingException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Stored route snapshot is invalid");
        }
    }

    @Transactional(readOnly = true)
    public RouteVersionResponse version(Long id, long version, Authentication authentication) {
        ApiRoute route = getAccessibleRoute(id, authentication);
        return versionRepository.findByOrganizationIdAndRouteIdAndVersionNumber(
                route.getOrganization().getId(), route.getRouteId(), version)
                .map(this::versionResponse)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Route version not found"));
    }

    @Audited(action = "RESTORE_ROUTE_VERSION", resourceType = "ROUTE_VERSION")
    @Transactional
    public RouteResponse restore(Long id, long version, Authentication authentication) {
        ApiRoute route = getAccessibleRoute(id, authentication);
        RouteConfigurationVersion snapshot = versionRepository.findByOrganizationIdAndRouteIdAndVersionNumber(
                route.getOrganization().getId(), route.getRouteId(), version)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Route version not found"));
        RouteRequest restored;
        try {
            restored = objectMapper.readValue(snapshot.getConfigurationSnapshot(), RouteRequest.class);
        } catch (JsonProcessingException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Stored route snapshot is invalid");
        }
        validator.validate(restored);
        LocalDateTime now = LocalDateTime.now();
        apply(route, route.getOrganization(), restored, now);
        route.setConfigurationVersion(route.getConfigurationVersion() + 1);
        persistVersion(route, "RESTORE:" + version, actor(authentication), now);
        addOutbox(route, "RESTORE");
        return response(route);
    }

    private ApiRoute apply(ApiRoute route, Organization organization, RouteRequest request, LocalDateTime now) {
        route.setOrganization(organization);
        route.setRouteId(request.routeId());
        route.setName(request.name());
        route.setDescription(request.description());
        route.setPathPattern(request.pathPattern());
        route.setTargetUri(request.targetUri());
        route.setTargetBaseUrl(request.targetUri());
        route.setTargetPathPrefix(request.pathPattern());
        route.setStripPrefix(request.stripPrefix());
        route.setAllowedMethods(new HashSet<>(request.allowedMethods().stream().map(m -> m.toUpperCase(Locale.ROOT)).toList()));
        route.setActive(request.active());
        route.setDeleted(false);
        route.setCreatedAt(route.getCreatedAt() == null ? now : route.getCreatedAt());
        route.setUpdatedAt(now);
        applyPolicy(route, request.policy());
        route.setRequestsPerMinute(request.policy().rateLimitRequests());
        route.setResponseTimeoutMs(request.policy().timeoutMs());
        route.setIdempotencyEnabled(request.policy().idempotencyEnabled());
        route.getHeaderRules().clear();
        if (request.headerRules() != null) {
            for (HeaderRuleRequest ruleRequest : request.headerRules()) {
                RouteHeaderRule rule = new RouteHeaderRule();
                rule.setRoute(route);
                rule.setDirection(ruleRequest.direction());
                rule.setAction(ruleRequest.action());
                rule.setHeaderName(ruleRequest.headerName());
                rule.setHeaderValue(ruleRequest.headerValue());
                rule.setCreatedAt(now);
                rule.setUpdatedAt(now);
                route.getHeaderRules().add(rule);
            }
        }
        return route;
    }

    private void applyPolicy(ApiRoute route, RoutePolicyRequest request) {
        RoutePolicy policy = route.getPolicy() == null ? new RoutePolicy() : route.getPolicy();
        policy.setRoute(route);
        policy.setAuthenticationRequired(request.authenticationRequired());
        policy.setPermittedRoles(request.permittedRoles() == null ? new HashSet<>() : new HashSet<>(request.permittedRoles()));
        policy.setRateLimitEnabled(request.rateLimitEnabled());
        policy.setRateLimitRequests(request.rateLimitRequests());
        policy.setRateLimitWindowSeconds(request.rateLimitWindowSeconds());
        policy.setRateLimitScope(request.rateLimitScope());
        policy.setTimeoutMs(request.timeoutMs());
        policy.setIdempotencyEnabled(request.idempotencyEnabled());
        policy.setRewriteEnabled(request.rewriteEnabled());
        policy.setRewriteTargetPrefix(request.rewriteTargetPrefix());
        LocalDateTime now = LocalDateTime.now();
        policy.setCreatedAt(policy.getCreatedAt() == null ? now : policy.getCreatedAt());
        policy.setUpdatedAt(now);
        route.setPolicy(policy);
    }

    private void persistVersion(ApiRoute route, String changeType, String actor, LocalDateTime now) {
        RouteConfigurationVersion version = new RouteConfigurationVersion();
        version.setOrganization(route.getOrganization());
        version.setRouteId(route.getRouteId());
        version.setVersionNumber(route.getConfigurationVersion());
        version.setChangeType(changeType);
        version.setCreatedBy(actor);
        version.setCreatedAt(now);
        try {
            version.setConfigurationSnapshot(objectMapper.writeValueAsString(snapshotRequest(route)));
        } catch (JsonProcessingException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to create route configuration snapshot");
        }
        versionRepository.save(version);
    }

    private RouteRequest snapshotRequest(ApiRoute route) {
        RoutePolicy policy = route.getPolicy();
        RoutePolicyRequest policyRequest = new RoutePolicyRequest(policy.isAuthenticationRequired(),
                new HashSet<>(policy.getPermittedRoles()), policy.isRateLimitEnabled(), policy.getRateLimitRequests(),
                policy.getRateLimitWindowSeconds(), policy.getRateLimitScope(), policy.getTimeoutMs(),
                policy.isIdempotencyEnabled(), policy.isRewriteEnabled(), policy.getRewriteTargetPrefix());
        List<HeaderRuleRequest> rules = route.getHeaderRules().stream().map(rule ->
                new HeaderRuleRequest(rule.getDirection(), rule.getAction(), rule.getHeaderName(), rule.getHeaderValue())).toList();
        return new RouteRequest(route.getOrganization().getId(), route.getRouteId(), route.getName(), route.getDescription(), route.getPathPattern(),
                route.getTargetUri(), route.isStripPrefix(), new HashSet<>(route.getAllowedMethods()), route.isActive(), policyRequest, rules);
    }

    private void addOutbox(ApiRoute route, String changeType) {
        ConfigurationChangeEvent event = new ConfigurationChangeEvent(UUID.randomUUID().toString(),
                route.getOrganization().getId(), route.getRouteId(), route.getConfigurationVersion(), changeType,
                java.time.Instant.now(), "api-management", "/api/gateway/routes");
        RouteConfigurationOutbox outbox = new RouteConfigurationOutbox();
        outbox.setEventId(event.eventId());
        outbox.setRouteId(event.routeId());
        outbox.setOrganizationId(event.organizationId());
        outbox.setConfigurationVersion(event.configurationVersion());
        outbox.setChangeType(changeType);
        try {
            outbox.setPayloadJson(objectMapper.writeValueAsString(event));
        } catch (JsonProcessingException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to create configuration event");
        }
        outbox.setStatus(OutboxStatus.PENDING);
        outbox.setAttempts(0);
        outbox.setCreatedAt(LocalDateTime.now());
        outboxRepository.save(outbox);
    }

    private ApiRoute getAccessibleRoute(Long id, Authentication authentication) {
        ApiRoute route = routeRepository.findById(id)
                .filter(r -> !r.isDeleted())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Route not found"));
        tenantAuthorization.requireOrganization(route.getOrganization().getId(), authentication);
        return route;
    }

    private String actor(Authentication authentication) {
        return authentication == null ? "SYSTEM" : authentication.getName();
    }

    private List<HeaderRuleRequest> headerRequests(ApiRoute route) {
        return route.getHeaderRules().stream().map(r ->
                new HeaderRuleRequest(r.getDirection(), r.getAction(), r.getHeaderName(), r.getHeaderValue())).toList();
    }

    private RouteResponse response(ApiRoute route) {
        RoutePolicy policy = route.getPolicy();
        RoutePolicyResponse policyResponse = policy == null ? null : new RoutePolicyResponse(
                policy.isAuthenticationRequired(), new HashSet<>(policy.getPermittedRoles()), policy.isRateLimitEnabled(),
                policy.getRateLimitRequests(), policy.getRateLimitWindowSeconds(), policy.getRateLimitScope(), policy.getTimeoutMs(),
                policy.isIdempotencyEnabled(), policy.isRewriteEnabled(), policy.getRewriteTargetPrefix());
        List<HeaderRuleResponse> rules = route.getHeaderRules().stream()
                .map(r -> new HeaderRuleResponse(r.getId(), r.getDirection(), r.getAction(), r.getHeaderName(), r.getHeaderValue())).toList();
        return new RouteResponse(route.getId(), route.getOrganization().getId(), route.getRouteId(), route.getName(),
                route.getDescription(), route.getPathPattern(), route.getTargetUri(), route.isStripPrefix(),
                new HashSet<>(route.getAllowedMethods()), route.isActive(), route.isDeleted(), route.getConfigurationVersion(),
                policyResponse, rules, route.getCreatedAt(), route.getUpdatedAt());
    }

    private RouteVersionResponse versionResponse(RouteConfigurationVersion version) {
        return new RouteVersionResponse(version.getId(), version.getRouteId(), version.getVersionNumber(),
                version.getChangeType(), version.getConfigurationSnapshot(), version.getCreatedBy(), version.getCreatedAt());
    }
}
