import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { InlineAlert } from '@/components/ui/Feedback';
import { Checkbox, Field, Input, Switch } from '@/components/ui/Form';
import { isApiError } from '@/lib/errors';
import type { TenantAdmin, TenantAdminRequest } from '@/types/api';
import { tenantAdminSchema, type TenantAdminFormValues } from './schema';

export type TenantAdminDialogMode = 'create' | 'edit' | 'deactivate' | 'activate';

const copy: Record<TenantAdminDialogMode, { title: string; submit: string; description?: string }> = {
  create: { title: 'Create tenant administrator', submit: 'Create administrator', description: 'One administrator per organization.' },
  edit: { title: 'Edit tenant administrator', submit: 'Save and replace password' },
  deactivate: { title: 'Deactivate tenant administrator', submit: 'Deactivate and replace password' },
  activate: { title: 'Activate tenant administrator', submit: 'Activate and replace password' },
};

interface Props {
  open: boolean;
  mode: TenantAdminDialogMode;
  admin?: TenantAdmin | null;
  organizationName: string;
  onClose: () => void;
  onSubmit: (request: TenantAdminRequest) => Promise<unknown>;
}

export function TenantAdminDialog({ open, mode, admin, organizationName, onClose, onSubmit }: Props) {
  const replacesPassword = mode !== 'create';
  const schema = useMemo(() => tenantAdminSchema(replacesPassword), [replacesPassword]);
  const [serverError, setServerError] = useState<string | null>(null);

  const defaults = useMemo<TenantAdminFormValues>(
    () => ({
      username: admin?.username ?? '',
      password: '',
      confirmPassword: '',
      enabled: mode === 'deactivate' ? false : mode === 'activate' ? true : (admin?.enabled ?? true),
      acknowledge: false,
    }),
    [admin, mode],
  );

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TenantAdminFormValues>({ resolver: zodResolver(schema), defaultValues: defaults });

  useEffect(() => {
    if (open) {
      reset(defaults);
      setServerError(null);
    }
  }, [open, defaults, reset]);

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await onSubmit({ username: values.username.trim(), password: values.password, enabled: values.enabled });
      onClose();
    } catch (error) {
      if (isApiError(error) && error.kind === 'conflict' && /username/i.test(error.message)) {
        setError('username', { message: error.message });
      } else {
        setServerError(isApiError(error) ? error.message : 'Saving failed. Try again.');
      }
    }
  });

  const text = copy[mode];
  const statusChangeOnly = mode === 'deactivate' || mode === 'activate';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      busy={isSubmitting}
      title={text.title}
      description={text.description ? `${text.description} Organization: ${organizationName}.` : `Organization: ${organizationName}.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant={mode === 'deactivate' ? 'danger' : 'primary'} type="submit" form="tenant-admin-form" loading={isSubmitting}>
            {text.submit}
          </Button>
        </>
      }
    >
      <form id="tenant-admin-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        {replacesPassword ? (
          <InlineAlert tone="warning" title="This update requires a new password">
            The backend accepts administrator changes only together with a password, so saving{' '}
            {statusChangeOnly ? 'this status change' : 'any change'} replaces {admin?.username ? <strong>{admin.username}</strong> : 'the administrator'}’s
            current password. Share the new password with them through a secure channel.
          </InlineAlert>
        ) : null}
        {serverError ? <InlineAlert tone="danger">{serverError}</InlineAlert> : null}

        <Field label="Username" htmlFor="ta-username" required error={errors.username?.message} hint={statusChangeOnly ? 'Unchanged.' : 'Must be unique across NexGate.'}>
          <Input id="ta-username" autoComplete="off" readOnly={statusChangeOnly} data-autofocus={!statusChangeOnly || undefined} invalid={Boolean(errors.username)} {...register('username')} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={replacesPassword ? 'New password' : 'Password'} htmlFor="ta-password" required error={errors.password?.message} hint="8–100 characters.">
            <Input id="ta-password" type="password" autoComplete="new-password" data-autofocus={statusChangeOnly || undefined} invalid={Boolean(errors.password)} {...register('password')} />
          </Field>
          <Field label="Confirm password" htmlFor="ta-confirm" required error={errors.confirmPassword?.message}>
            <Input id="ta-confirm" type="password" autoComplete="new-password" invalid={Boolean(errors.confirmPassword)} {...register('confirmPassword')} />
          </Field>
        </div>

        {statusChangeOnly ? null : (
          <Switch label="Account enabled" description="Disabled administrators can’t sign in." {...register('enabled')} />
        )}

        {replacesPassword ? (
          <div className="rounded-lg border border-line px-3.5 py-3">
            <Checkbox
              label={
                <span className="flex items-center gap-1.5">
                  <KeyRound className="size-3.5 text-warning-fg" aria-hidden />
                  Replace the current password
                </span>
              }
              description="I understand the administrator’s existing password stops working after I save."
              aria-invalid={Boolean(errors.acknowledge) || undefined}
              {...register('acknowledge')}
            />
            {errors.acknowledge ? (
              <p role="alert" className="mt-1.5 text-[12.5px] text-danger-fg">
                {errors.acknowledge.message}
              </p>
            ) : null}
          </div>
        ) : null}
      </form>
    </Dialog>
  );
}
