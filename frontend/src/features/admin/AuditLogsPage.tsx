import { Code } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { UnavailableNotice } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/Page';

const AUDITED_ACTIONS = ['CREATE_ROUTE', 'UPDATE_ROUTE', 'CHANGE_ROUTE_STATUS', 'DELETE_ROUTE', 'UPDATE_ROUTE_POLICY', 'RESTORE_ROUTE_VERSION'];

export function AuditLogsPage() {
  return (
    <>
      <PageHeader title="Audit logs" description="Administrative actions recorded by the control plane." />
      <UnavailableNotice
        title="Audit records can’t be shown yet"
        reason={
          <>
            API Management stores audit records in the <Code>control_plane_audit_records</Code> table, but no endpoint exposes them.
            This page will list them once an audit API exists.
          </>
        }
        className="mb-5"
      />
      <Card>
        <CardHeader title="What the backend records today" description="Defined by @Audited annotations in RouteService." />
        <CardBody className="flex flex-col gap-3 text-[13px] text-fg-muted">
          <p>Each record stores the actor, action, resource type and ID, result (success or failure), duration and timestamp.</p>
          <div className="flex flex-wrap gap-1.5">
            {AUDITED_ACTIONS.map((action) => (
              <Code key={action}>{action}</Code>
            ))}
          </div>
          <p>Organization and tenant administrator changes are not audited by the backend at this time.</p>
        </CardBody>
      </Card>
    </>
  );
}
