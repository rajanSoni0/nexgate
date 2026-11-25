import { useEffect, useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { InlineAlert } from '@/components/ui/Feedback';
import { useToast } from '@/components/ui/Toast';
import { isApiError } from '@/lib/errors';
import type { Route } from '@/types/api';
import { useUpdateRoutePolicy } from './hooks';
import { PolicyFields } from './PolicyFields';
import { formToPolicy, makePolicyOnlySchema, policyToForm, type PolicyOnlyFormValues } from './schema';

/** PUT /api/gateway/admin/routes/{id}/policy — changes only the policy. */
export function PolicyDialog({ route, open, onClose }: { route: Route; open: boolean; onClose: () => void }) {
  const schema = useMemo(() => makePolicyOnlySchema(route.allowedMethods), [route.allowedMethods]);
  const update = useUpdateRoutePolicy(route.id);
  const toast = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<PolicyOnlyFormValues>({ resolver: zodResolver(schema), defaultValues: { policy: policyToForm(route.policy) } });

  useEffect(() => {
    if (open) {
      form.reset({ policy: policyToForm(route.policy) });
      setServerError(null);
    }
  }, [open, route, form]);

  const submit = form.handleSubmit(async (values) => {
    setServerError(null);
    try {
      const saved = await update.mutateAsync(formToPolicy(values.policy));
      toast.success('Policy saved', `${route.name} is now at version ${saved.configurationVersion}`);
      onClose();
    } catch (error) {
      setServerError(isApiError(error) ? error.message : 'Saving failed. Try again.');
    }
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      busy={form.formState.isSubmitting}
      title={`Edit policy for ${route.name}`}
      description={`Saving creates configuration version ${route.configurationVersion + 1}.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={form.formState.isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="policy-form" loading={form.formState.isSubmitting}>
            Save policy
          </Button>
        </>
      }
    >
      <FormProvider {...form}>
        <form id="policy-form" onSubmit={submit} noValidate>
          {serverError ? <InlineAlert tone="danger" className="mb-4">{serverError}</InlineAlert> : null}
          <PolicyFields allowedMethods={route.allowedMethods} />
        </form>
      </FormProvider>
    </Dialog>
  );
}
