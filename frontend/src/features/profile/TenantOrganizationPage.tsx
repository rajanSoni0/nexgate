import { Card, CardBody, CardHeader, DetailList } from '@/components/ui/Card';
import { UnavailableNotice } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/Page';
import { useSession } from '@/features/auth/AuthProvider';

/**
 * Tenant Admins can't read organization records: every organization endpoint is
 * under /api/platform/** (PLATFORM_ADMIN only) and there are no /api/tenant/**
 * endpoints. Only facts carried by the session are shown.
 */
export function TenantOrganizationPage() {
  const session = useSession();
  return (
    <>
      <PageHeader title="Organization details" description="The organization your administrator account belongs to." />
      <Card className="mb-5">
        <CardHeader title="From your session" description="Issued by API Management when you signed in." />
        <CardBody>
          <DetailList
            items={[
              { label: 'Organization ID', value: <span className="font-mono text-[13px]">#{session.organizationId}</span> },
              { label: 'Administrator', value: session.username },
              { label: 'Status at sign-in', value: 'Active. Members of pending or suspended organizations can’t sign in.' },
            ]}
          />
        </CardBody>
      </Card>
      <UnavailableNotice
        title="Name, slug and settings aren’t available to tenant administrators"
        reason="All organization endpoints require the platform administrator role, and there is no tenant-facing organization API. Ask your platform administrator for changes."
      />
    </>
  );
}
