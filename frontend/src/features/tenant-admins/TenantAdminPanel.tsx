import { useState } from 'react';
import { Pencil, Power, PowerOff, Trash2, UserPlus, UserRound } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, DetailList } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { EmptyState, ErrorState, InlineAlert, LoadingBlock } from '@/components/ui/Feedback';
import { useToast } from '@/components/ui/Toast';
import { isApiError } from '@/lib/errors';
import type { Organization } from '@/types/api';
import { useDeleteTenantAdmin, useSaveTenantAdmin, useTenantAdmin } from '../organizations/hooks';
import { TenantAdminDialog, type TenantAdminDialogMode } from './TenantAdminDialog';

export function TenantAdminPanel({ organization }: { organization: Organization }) {
  const admin = useTenantAdmin(organization.id);
  const existing = admin.data ?? null;
  const save = useSaveTenantAdmin(organization.id, existing ? 'update' : 'create');
  const remove = useDeleteTenantAdmin(organization.id);
  const toast = useToast();
  const [dialog, setDialog] = useState<TenantAdminDialogMode | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const successText: Record<TenantAdminDialogMode, string> = {
    create: 'Tenant administrator created',
    edit: 'Tenant administrator updated',
    deactivate: 'Tenant administrator deactivated',
    activate: 'Tenant administrator activated',
  };

  return (
    <Card>
      <CardHeader
        title="Tenant administrator"
        description="Manages this organization’s routes and policies."
        actions={
          existing ? (
            <>
              <Button size="sm" icon={<Pencil className="size-3.5" />} onClick={() => setDialog('edit')}>
                Edit
              </Button>
              {existing.enabled ? (
                <Button size="sm" icon={<PowerOff className="size-3.5" />} onClick={() => setDialog('deactivate')}>
                  Deactivate
                </Button>
              ) : (
                <Button size="sm" icon={<Power className="size-3.5" />} onClick={() => setDialog('activate')}>
                  Activate
                </Button>
              )}
              <Button size="sm" variant="danger-ghost" icon={<Trash2 className="size-3.5" />} onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            </>
          ) : null
        }
      />
      <CardBody>
        {admin.isPending ? (
          <LoadingBlock rows={2} label="Loading tenant administrator" />
        ) : admin.isError ? (
          <ErrorState error={admin.error} onRetry={() => admin.refetch()} retrying={admin.isFetching} compact />
        ) : existing ? (
          <div className="flex flex-col gap-4">
            <DetailList
              items={[
                { label: 'Username', value: <span className="font-medium">{existing.username}</span> },
                {
                  label: 'Account',
                  value: existing.enabled ? (
                    <Badge tone="success" dot>
                      Enabled
                    </Badge>
                  ) : (
                    <Badge tone="neutral" dot>
                      Disabled
                    </Badge>
                  ),
                },
                { label: 'User ID', value: <span className="font-mono text-[13px]">{existing.id}</span> },
              ]}
            />
            {organization.status !== 'ACTIVE' && existing.enabled ? (
              <InlineAlert tone="warning">
                This account is enabled, but it can’t sign in until the organization is active.
              </InlineAlert>
            ) : null}
          </div>
        ) : (
          <EmptyState
            icon={<UserRound className="size-6" />}
            title="No tenant administrator"
            description="Create one so this organization can manage its own routes."
            action={
              <Button variant="primary" size="sm" icon={<UserPlus className="size-3.5" />} onClick={() => setDialog('create')}>
                Create administrator
              </Button>
            }
            className="py-6"
          />
        )}
      </CardBody>

      {dialog ? (
        <TenantAdminDialog
          open
          mode={dialog}
          admin={existing}
          organizationName={organization.name}
          onClose={() => setDialog(null)}
          onSubmit={async (request) => {
            const mode = dialog;
            await save.mutateAsync(request);
            toast.success(successText[mode], mode === 'create' ? undefined : 'The previous password no longer works.');
          }}
        />
      ) : null}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete tenant administrator?"
        description={`${existing?.username ?? 'This account'} will be removed permanently and can no longer sign in. You can create a new administrator afterwards.`}
        confirmLabel="Delete administrator"
        tone="danger"
        loading={remove.isPending}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() =>
          remove.mutate(undefined, {
            onSuccess: () => {
              setConfirmDelete(false);
              toast.success('Tenant administrator deleted');
            },
            onError: (error) => toast.error('Couldn’t delete the administrator', isApiError(error) ? error.message : undefined),
          })
        }
      />
    </Card>
  );
}
