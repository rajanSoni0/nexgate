import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, DetailList } from '@/components/ui/Card';
import { Code } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { ErrorState, InlineAlert, LoadingBlock } from '@/components/ui/Feedback';
import { Field, Input } from '@/components/ui/Form';
import { PageHeader } from '@/components/ui/Page';
import { useToast } from '@/components/ui/Toast';
import { isApiError } from '@/lib/errors';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { SettableOrganizationStatus } from '@/types/api';
import { TenantAdminPanel } from '../tenant-admins/TenantAdminPanel';
import { useChangeOrganizationStatus, useDeleteOrganization, useOrganization, useUpdateOrganization } from './hooks';
import { OrganizationFormDialog } from './OrganizationFormDialog';
import { OrganizationStatusBadge, organizationStatusInfo } from './status';

const STATUSES: SettableOrganizationStatus[] = ['ACTIVE', 'PENDING', 'SUSPENDED'];

export function OrganizationDetailPage() {
  const id = Number(useParams().organizationId);
  const organization = useOrganization(id);
  const update = useUpdateOrganization(id);
  const changeStatus = useChangeOrganizationStatus(id);
  const remove = useDeleteOrganization(id);
  const toast = useToast();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<SettableOrganizationStatus | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmSlug, setConfirmSlug] = useState('');

  const crumbs = [{ label: 'Organizations', to: '/platform/organizations' }, { label: organization.data?.name ?? `#${id}` }];

  if (organization.isPending) {
    return (
      <>
        <PageHeader title="Organization" breadcrumbs={crumbs} />
        <LoadingBlock rows={6} label="Loading organization" />
      </>
    );
  }
  if (organization.isError) {
    return (
      <>
        <PageHeader title="Organization" breadcrumbs={crumbs} />
        <ErrorState error={organization.error} onRetry={() => organization.refetch()} retrying={organization.isFetching} />
      </>
    );
  }

  const org = organization.data;

  return (
    <>
      <PageHeader
        title={org.name}
        breadcrumbs={crumbs}
        meta={
          <>
            <OrganizationStatusBadge status={org.status} />
            <Code>{org.slug}</Code>
          </>
        }
        actions={
          <>
            <Button icon={<Pencil className="size-4" />} onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Button variant="danger-ghost" icon={<Trash2 className="size-4" />} onClick={() => setDeleting(true)}>
              Delete
            </Button>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader title="Details" />
            <CardBody>
              <DetailList
                items={[
                  { label: 'Organization ID', value: <span className="font-mono text-[13px]">{org.id}</span> },
                  { label: 'Slug', value: <Code>{org.slug}</Code> },
                  { label: 'Created', value: formatDateTime(org.createdAt) },
                  { label: 'Last updated', value: formatDateTime(org.updatedAt) },
                ]}
              />
            </CardBody>
          </Card>
          <TenantAdminPanel organization={org} />
        </div>

        <Card className="h-fit">
          <CardHeader title="Status" description="Controls whether the organization’s administrator can sign in." />
          <CardBody>
            <div role="radiogroup" aria-label="Organization status" className="flex flex-col gap-2">
              {STATUSES.map((status) => {
                const info = organizationStatusInfo(status);
                const current = org.status === status;
                return (
                  <button
                    key={status}
                    type="button"
                    role="radio"
                    aria-checked={current}
                    disabled={current || changeStatus.isPending}
                    onClick={() => setPendingStatus(status)}
                    className={cn(
                      'flex items-start gap-3 rounded-lg border px-3.5 py-3 text-left transition-colors',
                      current ? 'border-accent bg-accent-soft' : 'border-line hover:border-line-strong hover:bg-surface-2/60',
                    )}
                  >
                    <span className={cn('mt-1 size-3.5 shrink-0 rounded-full border-2', current ? 'border-accent bg-accent' : 'border-line-strong')} aria-hidden />
                    <span>
                      <span className="block text-sm font-medium text-fg">
                        {info.label}
                        {current ? <span className="ml-1.5 font-normal text-fg-muted">(current)</span> : null}
                      </span>
                      <span className="block text-[12.5px] text-fg-muted">{info.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </CardBody>
        </Card>
      </div>

      <OrganizationFormDialog
        open={editing}
        organization={org}
        onClose={() => setEditing(false)}
        onSubmit={async (request) => {
          await update.mutateAsync(request);
          toast.success('Organization updated');
        }}
      />

      <ConfirmDialog
        open={pendingStatus != null}
        title={pendingStatus ? `Change status to ${organizationStatusInfo(pendingStatus).label.toLowerCase()}?` : ''}
        description={pendingStatus ? organizationStatusInfo(pendingStatus).description : undefined}
        confirmLabel={pendingStatus === 'ACTIVE' ? 'Activate organization' : pendingStatus === 'SUSPENDED' ? 'Suspend organization' : 'Mark as pending'}
        tone={pendingStatus === 'SUSPENDED' ? 'danger' : 'primary'}
        loading={changeStatus.isPending}
        onClose={() => setPendingStatus(null)}
        onConfirm={() =>
          pendingStatus &&
          changeStatus.mutate(pendingStatus, {
            onSuccess: (updated) => {
              setPendingStatus(null);
              toast.success(`Organization ${organizationStatusInfo(updated.status).label.toLowerCase()}`);
            },
            onError: (error) => toast.error('Couldn’t change the status', isApiError(error) ? error.message : undefined),
          })
        }
      >
        {pendingStatus === 'SUSPENDED' ? (
          <InlineAlert tone="warning">Its administrator won’t be able to sign in. Existing sessions stay valid until their tokens expire.</InlineAlert>
        ) : null}
      </ConfirmDialog>

      <ConfirmDialog
        open={deleting}
        title="Delete organization?"
        description="The organization is soft-deleted and disappears from the console. The console offers no way to restore it."
        confirmLabel="Delete organization"
        tone="danger"
        loading={remove.isPending}
        confirmDisabled={confirmSlug !== org.slug}
        onClose={() => {
          setDeleting(false);
          setConfirmSlug('');
        }}
        onConfirm={() =>
          remove.mutate(undefined, {
            onSuccess: () => {
              toast.success('Organization deleted', org.name);
              navigate('/platform/organizations', { replace: true });
            },
            onError: (error) => toast.error('Couldn’t delete the organization', isApiError(error) ? error.message : undefined),
          })
        }
      >
        <Field label={<>Type <span className="font-mono">{org.slug}</span> to confirm</>} htmlFor="confirm-slug">
          <Input id="confirm-slug" mono autoComplete="off" value={confirmSlug} onChange={(event) => setConfirmSlug(event.target.value)} />
        </Field>
      </ConfirmDialog>
    </>
  );
}
