package in.rajan.nexgate.management;

import in.rajan.nexgate.management.audit.AdministrativeAuditAspect;
import in.rajan.nexgate.management.audit.Audited;
import in.rajan.nexgate.management.entity.ControlPlaneAuditRecord;
import in.rajan.nexgate.management.repository.ControlPlaneAuditRecordRepository;
import org.aspectj.lang.ProceedingJoinPoint;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

class AdministrativeAuditAspectTests {
    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void successfulOperationCreatesAuditWithoutSensitiveValues() throws Throwable {
        ControlPlaneAuditRecordRepository repository = mock(ControlPlaneAuditRecordRepository.class);
        AdministrativeAuditAspect aspect = new AdministrativeAuditAspect(repository);
        ProceedingJoinPoint joinPoint = mock(ProceedingJoinPoint.class);
        Audited audited = mock(Audited.class);
        when(audited.action()).thenReturn("CREATE_ROUTE");
        when(audited.resourceType()).thenReturn("ROUTE");
        when(joinPoint.proceed()).thenReturn("ok");
        when(joinPoint.getArgs()).thenReturn(new Object[]{123L, "password=secret", "Bearer sensitive-token"});
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                "tenant-admin", null, List.of(new SimpleGrantedAuthority("ROLE_TENANT_ADMIN"))));

        aspect.audit(joinPoint, audited);

        var captor = org.mockito.ArgumentCaptor.forClass(ControlPlaneAuditRecord.class);
        verify(repository).save(captor.capture());
        ControlPlaneAuditRecord record = captor.getValue();
        assertEquals("CREATE_ROUTE", record.getAction());
        assertEquals("SUCCESS", record.getResult());
        assertEquals("tenant-admin", record.getActor());
        assertFalse(record.getDetails().contains("password"));
        assertFalse(record.getDetails().contains("Bearer"));
    }
}
