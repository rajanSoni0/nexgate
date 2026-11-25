import { ErrorState, UnavailableNotice } from '@/components/ui/Feedback';
import { isApiError } from '@/lib/errors';

/** Shown once per page when the analytics service rejects the request. */
export function AnalyticsFailure({ error, onRetry, retrying }: { error: unknown; onRetry: () => void; retrying?: boolean }) {
  const unauthorized = isApiError(error) && (error.kind === 'unauthorized' || error.kind === 'forbidden');
  return (
    <ErrorState
      error={error}
      onRetry={onRetry}
      retrying={retrying}
      hint={
        unauthorized ? (
          <>
            analytics-service (commit 42751c0) includes Spring Security but no JWT configuration, so it rejects every caller,
            including valid NexGate sessions. Data appears here once the service accepts the API Management token. Your console
            session is unaffected.
          </>
        ) : undefined
      }
    />
  );
}

export const MISSING_ANALYTICS = [
  { title: 'Request timeline', reason: 'No time-series endpoint. Summaries are all-time totals.' },
  { title: 'Latency trend over time', reason: 'Only all-time average latencies are available, per route and overall.' },
  { title: 'HTTP status distribution', reason: 'Only successful (< 400) and failed (≥ 400) counts are exposed.' },
  { title: 'Top organizations', reason: 'No endpoint groups traffic by organization.' },
  { title: 'Recent API activity and failed requests', reason: 'No endpoint lists individual access events.' },
  { title: 'Time-range filters', reason: 'Analytics endpoints accept no time parameters, so 15 min / 1 h / 24 h / 7 d / 30 d / custom ranges aren’t possible.' },
];

export function MissingAnalyticsList() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {MISSING_ANALYTICS.map((item) => (
        <UnavailableNotice key={item.title} title={item.title} reason={item.reason} variant="inline" />
      ))}
    </div>
  );
}

/** Tenant-facing analytics are withheld on purpose (agreed decision). */
export function TenantAnalyticsWithheld({ subject }: { subject: string }) {
  return (
    <UnavailableNotice
      title={`${subject} aren’t available yet`}
      reason={
        <>
          The analytics service only reports platform-wide totals; it can’t filter traffic by organization. Showing those totals
          here would expose other organizations’ traffic, so this page stays empty until the backend offers organization-scoped
          analytics. No analytics requests are made from this page.
        </>
      }
    />
  );
}
