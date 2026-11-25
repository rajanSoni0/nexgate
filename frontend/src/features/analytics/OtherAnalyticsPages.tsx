import { UnavailableNotice } from '@/components/ui/Feedback';
import { PageHeader, Section } from '@/components/ui/Page';
import { MissingAnalyticsList, TenantAnalyticsWithheld } from './AnalyticsNotices';

export function OrganizationAnalyticsPage() {
  return (
    <>
      <PageHeader title="Organization analytics" description="Traffic broken down by organization." />
      <UnavailableNotice
        title="Per-organization analytics aren’t available"
        reason={
          <>
            Access events carry an organization ID, but none of the analytics endpoints (summary, routes, slow-routes,
            rate-limit-rejections, idempotency-replays) group or filter by it. Route IDs are only unique within an organization, so
            per-route figures can’t be attributed to organizations safely either.
          </>
        }
      />
      <Section title="Other missing analytics" className="mt-8">
        <MissingAnalyticsList />
      </Section>
    </>
  );
}

export function TenantApiAnalyticsPage() {
  return (
    <>
      <PageHeader title="API analytics" description="Traffic through your organization’s routes." />
      <TenantAnalyticsWithheld subject="Organization analytics" />
    </>
  );
}

export function TenantRouteAnalyticsPage() {
  return (
    <>
      <PageHeader title="Route analytics" description="Per-route traffic, errors and latency for your organization." />
      <TenantAnalyticsWithheld subject="Route analytics" />
    </>
  );
}
