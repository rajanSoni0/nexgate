import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Eye, Pencil, Power, PowerOff, ShieldCheck, Trash2 } from 'lucide-react';
import { Badge, Code } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, DetailList } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { EmptyState, ErrorState, InlineAlert, LoadingBlock } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/Page';
import { Table, TBody, Td, Th, THead } from '@/components/ui/Table';
import { Tabs } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import { isApiError } from '@/lib/errors';
import { formatDateTime, formatMs } from '@/lib/format';
import { useSession } from '@/features/auth/AuthProvider';
import { useOrganizations } from '@/features/organizations/hooks';
import type { Route } from '@/types/api';
import { useDeleteRoute, useRoute, useSetRouteActive } from './hooks';
import { MethodList, RouteStatusBadge } from './parts';
import { PolicyDialog } from './PolicyDialog';
import { RoutePipeline } from './RoutePipeline';
import { VersionsPanel } from './VersionsPanel';

type TabId = 'overview' | 'policy' | 'headers' | 'versions';
const TABS: TabId[] = ['overview', 'policy', 'headers', 'versions'];

export function RouteDetailPage() {
  const session = useSession();
  const readOnly = session.role === 'PLATFORM_ADMIN';
  const base = readOnly ? '/platform/routes' : '/tenant/routes';
  const id = Number(useParams().routeId);
  const route = useRoute(id);
  const [params, setParams] = useSearchParams();
  const tabParam = params.get('tab') as TabId | null;
  const tab: TabId = tabParam && TABS.includes(tabParam) ? tabParam : 'overview';

  const crumbs = [{ label: readOnly ? 'Routes' : 'My routes', to: base }, { label: route.data?.name ?? `Route #${id}` }];

  if (route.isPending) {
    return (
      <>
        <PageHeader title="Route" breadcrumbs={crumbs} />
        <LoadingBlock rows={6} label="Loading route" />
      </>
    );
  }
  if (route.isError) {
    return (
      <>
        <PageHeader title="Route" breadcrumbs={crumbs} />
        <ErrorState error={route.error} onRetry={() => route.refetch()} retrying={route.isFetching} />
      </>
    );
  }

  return (
    <RouteDetail
      route={route.data}
      readOnly={readOnly}
      base={base}
      crumbs={crumbs}
      tab={tab}
      onTab={(next) => setParams(next === 'overview' ? {} : { tab: next }, { replace: true })}
    />
  );
}

function RouteDetail({
  route,
  readOnly,
  base,
  crumbs,
  tab,
  onTab,
}: {
  route: Route;
  readOnly: boolean;
  base: string;
  crumbs: Array<{ label: string; to?: string }>;
  tab: TabId;
  onTab: (tab: TabId) => void;
}) {
  const toast = useToast();
  const navigate = useNavigate();
  const setActive = useSetRouteActive(route.id);
  const remove = useDeleteRoute(route.id);
  const organizations = useOrganizations(readOnly);
  const orgName = organizations.data?.find((org) => org.id === route.organizationId)?.name;
  const [confirmToggle, setConfirmToggle] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(false);
  const policy = route.policy;

  return (
    <>
      <PageHeader
        title={route.name}
        breadcrumbs={crumbs}
        description={route.description || undefined}
        meta={
          <>
            <RouteStatusBadge active={route.active} />
            <Code>{route.routeId}</Code>
            <Badge tone="neutral">Version {route.configurationVersion}</Badge>
            {readOnly ? (
              <Badge tone="accent">
                <Eye className="size-3" aria-hidden />
                Read-only oversight
              </Badge>
            ) : null}
          </>
        }
        actions={
          readOnly ? null : (
            <>
              <Link to={`${base}/${route.id}/edit`}>
                <Button icon={<Pencil className="size-4" />}>Edit route</Button>
              </Link>
              <Button icon={route.active ? <PowerOff className="size-4" /> : <Power className="size-4" />} onClick={() => setConfirmToggle(true)}>
                {route.active ? 'Deactivate' : 'Activate'}
              </Button>
              <Button variant="danger-ghost" icon={<Trash2 className="size-4" />} onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            </>
          )
        }
      />

      {readOnly ? (
        <InlineAlert tone="info" className="mb-5">
          Platform administrators can inspect routes across organizations. Changes are made by each organization’s tenant administrator.
        </InlineAlert>
      ) : null}

      <Tabs
        label="Route details"
        value={tab}
        onChange={(id) => onTab(id as TabId)}
        className="mb-5"
        items={[
          { id: 'overview', label: 'Overview' },
          { id: 'policy', label: 'Policy' },
          { id: 'headers', label: `Headers (${route.headerRules.length})` },
          { id: 'versions', label: 'Versions' },
        ]}
      />

      {tab === 'overview' ? (
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader title="Request pipeline" description="How the gateway handles a request to this route." />
            <CardBody className="py-5">
              <RoutePipeline route={route} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Configuration" />
            <CardBody>
              <DetailList
                items={[
                  { label: 'Route ID', value: <Code>{route.routeId}</Code> },
                  {
                    label: 'Organization',
                    value: readOnly ? (
                      <Link className="text-accent-fg hover:underline" to={`/platform/organizations/${route.organizationId}`}>
                        {orgName ?? `#${route.organizationId}`}
                      </Link>
                    ) : (
                      <span className="font-mono text-[13px]">#{route.organizationId}</span>
                    ),
                  },
                  { label: 'Path pattern', value: <Code>{route.pathPattern}</Code> },
                  { label: 'Target URI', value: <Code>{route.targetUri}</Code> },
                  { label: 'Allowed methods', value: <MethodList methods={route.allowedMethods} /> },
                  { label: 'Strip prefix', value: route.stripPrefix ? 'Yes' : 'No' },
                  { label: 'Created', value: formatDateTime(route.createdAt) },
                  { label: 'Last updated', value: formatDateTime(route.updatedAt) },
                ]}
              />
            </CardBody>
          </Card>
        </div>
      ) : null}

      {tab === 'policy' ? (
        <Card>
          <CardHeader
            title="Gateway policy"
            actions={
              readOnly ? null : (
                <Button size="sm" icon={<ShieldCheck className="size-3.5" />} onClick={() => setEditingPolicy(true)}>
                  Edit policy
                </Button>
              )
            }
          />
          <CardBody>
            {policy ? (
              <DetailList
                items={[
                  { label: 'Authentication', value: policy.authenticationRequired ? 'Bearer token required' : 'Not required' },
                  {
                    label: 'Permitted roles',
                    value: policy.permittedRoles.length ? (
                      <span className="flex flex-wrap gap-1">
                        {policy.permittedRoles.map((role) => (
                          <Code key={role}>{role}</Code>
                        ))}
                      </span>
                    ) : (
                      'None'
                    ),
                  },
                  {
                    label: 'Rate limit',
                    value: policy.rateLimitEnabled
                      ? `${policy.rateLimitRequests ?? '?'} requests per ${policy.rateLimitWindowSeconds ?? '?'} s`
                      : 'Off',
                  },
                  { label: 'Rate-limit scope', value: policy.rateLimitScope ? <Code>{policy.rateLimitScope}</Code> : 'Not set (gateway uses ROUTE)' },
                  { label: 'Upstream timeout', value: formatMs(policy.timeoutMs) },
                  { label: 'POST idempotency', value: policy.idempotencyEnabled ? 'On' : 'Off' },
                  { label: 'Path rewrite', value: policy.rewriteEnabled ? 'On' : 'Off' },
                  { label: 'Rewrite prefix', value: policy.rewriteTargetPrefix ? <Code>{policy.rewriteTargetPrefix}</Code> : '—' },
                ]}
              />
            ) : (
              <EmptyState title="No policy recorded" description="This route has no stored policy." className="py-6" />
            )}
          </CardBody>
        </Card>
      ) : null}

      {tab === 'headers' ? (
        <Card>
          <CardHeader title="Header transformations" description={readOnly ? undefined : 'Edit the route to change these rules.'} />
          {route.headerRules.length === 0 ? (
            <EmptyState title="No header rules" description="Headers pass through unchanged." className="py-8" />
          ) : (
            <Table>
              <THead>
                <tr>
                  <Th>Direction</Th>
                  <Th>Action</Th>
                  <Th>Header</Th>
                  <Th>Value</Th>
                </tr>
              </THead>
              <TBody>
                {route.headerRules.map((rule) => (
                  <tr key={rule.id}>
                    <Td>{rule.direction === 'REQUEST' ? 'Request' : 'Response'}</Td>
                    <Td>
                      <Badge tone={rule.action === 'REMOVE' ? 'danger' : rule.action === 'ADD' ? 'success' : 'neutral'}>{rule.action}</Badge>
                    </Td>
                    <Td>
                      <Code>{rule.headerName}</Code>
                    </Td>
                    <Td>{rule.headerValue ? <Code>{rule.headerValue}</Code> : <span className="text-fg-subtle">—</span>}</Td>
                  </tr>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      ) : null}

      {tab === 'versions' ? (
        <Card>
          <CardHeader
            title="Configuration versions"
            description={readOnly ? 'Compare any two versions. Restoring is left to the tenant administrator.' : 'Every change is saved as a new version.'}
          />
          <CardBody>
            <VersionsPanel route={route} canRestore={!readOnly} />
          </CardBody>
        </Card>
      ) : null}

      {readOnly ? null : (
        <>
          <PolicyDialog route={route} open={editingPolicy} onClose={() => setEditingPolicy(false)} />
          <ConfirmDialog
            open={confirmToggle}
            title={route.active ? 'Deactivate route?' : 'Activate route?'}
            description={
              route.active
                ? 'The gateway stops serving this route once it receives the configuration change.'
                : 'The gateway starts serving this route once it receives the configuration change.'
            }
            confirmLabel={route.active ? 'Deactivate route' : 'Activate route'}
            tone={route.active ? 'danger' : 'primary'}
            loading={setActive.isPending}
            onClose={() => setConfirmToggle(false)}
            onConfirm={() =>
              setActive.mutate(!route.active, {
                onSuccess: (updated) => {
                  setConfirmToggle(false);
                  toast.success(updated.active ? 'Route activated' : 'Route deactivated');
                },
                onError: (error) => toast.error('Couldn’t change the route status', isApiError(error) ? error.message : undefined),
              })
            }
          />
          <ConfirmDialog
            open={confirmDelete}
            title="Delete route?"
            description="The route is deactivated and removed from your list. Its version history is kept, but the console offers no way to bring it back."
            confirmLabel="Delete route"
            tone="danger"
            loading={remove.isPending}
            onClose={() => setConfirmDelete(false)}
            onConfirm={() =>
              remove.mutate(undefined, {
                onSuccess: () => {
                  toast.success('Route deleted', route.name);
                  navigate(base, { replace: true });
                },
                onError: (error) => toast.error('Couldn’t delete the route', isApiError(error) ? error.message : undefined),
              })
            }
          />
        </>
      )}
    </>
  );
}
