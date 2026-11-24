package in.rajan.nexgate.management.audit;

import in.rajan.nexgate.management.entity.ControlPlaneAuditRecord;
import in.rajan.nexgate.management.repository.ControlPlaneAuditRecordRepository;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Aspect
@Component
public class AdministrativeAuditAspect {
    private final ControlPlaneAuditRecordRepository repository;

    public AdministrativeAuditAspect(ControlPlaneAuditRecordRepository repository) {
        this.repository = repository;
    }

    @Around("@annotation(audited)")
    public Object audit(ProceedingJoinPoint joinPoint, Audited audited) throws Throwable {
        long started = System.nanoTime();
        String result = "SUCCESS";
        String details = null;
        try {
            Object value = joinPoint.proceed();
            details = "Resource operation completed";
            return value;
        } catch (Throwable ex) {
            result = "FAILURE";
            details = ex.getClass().getSimpleName();
            throw ex;
        } finally {
            ControlPlaneAuditRecord record = new ControlPlaneAuditRecord();
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            record.setActor(authentication == null ? "SYSTEM" : authentication.getName());
            record.setAction(audited.action());
            record.setResourceType(audited.resourceType());
            record.setResourceId(extractResourceId(joinPoint.getArgs()));
            record.setDurationMs((System.nanoTime() - started) / 1_000_000);
            record.setResult(result);
            record.setDetails(details);
            record.setCreatedAt(LocalDateTime.now());
            repository.save(record);
        }
    }

    private String extractResourceId(Object[] args) {
        if (args == null || args.length == 0) return "-";
        for (Object arg : args) {
            if (arg instanceof Number number) return String.valueOf(number);
            if (arg instanceof CharSequence text) {
                String value = text.toString();
                if (!value.isBlank()) return value.length() <= 100 ? value : value.substring(0, 100);
            }
        }
        return "-";
    }
}
