import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FormProvider, useForm, useWatch, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { ErrorState, InlineAlert, LoadingBlock } from '@/components/ui/Feedback';
import { Checkbox, Field, Input, Switch, Textarea } from '@/components/ui/Form';
import { PageHeader } from '@/components/ui/Page';
import { Tabs } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import { isApiError } from '@/lib/errors';
import { HTTP_METHODS, type Route } from '@/types/api';
import { HeaderRulesFields } from './HeaderRulesFields';
import { useCreateRoute, useRoute, useUpdateRoute } from './hooks';
import { PolicyFields } from './PolicyFields';
import { DEFAULT_ROUTE_FORM, formToRouteRequest, routeFormSchema, routeToForm, type RouteFormValues } from './schema';

type TabId = 'general' | 'routing' | 'policy' | 'headers';

function tabsWithErrors(errors: FieldErrors<RouteFormValues>): Set<TabId> {
  const tabs = new Set<TabId>();
  if (errors.routeId || errors.name || errors.description) tabs.add('general');
  if (errors.pathPattern || errors.targetUri || errors.allowedMethods) tabs.add('routing');
  if (errors.policy) tabs.add('policy');
  if (errors.headerRules) tabs.add('headers');
  return tabs;
}

/** Route ↔ field mapping for the backend's 400 messages (RoutePolicyValidator). */
function fieldForServerMessage(message: string): { field: keyof RouteFormValues | 'policy.idempotencyEnabled' | 'policy.timeoutMs'; tab: TabId } | null {
  if (/target uri/i.test(message)) return { field: 'targetUri', tab: 'routing' };
  if (/path pattern/i.test(message)) return { field: 'pathPattern', tab: 'routing' };
  if (/http method/i.test(message)) return { field: 'allowedMethods', tab: 'routing' };
  if (/idempotency/i.test(message)) return { field: 'policy.idempotencyEnabled', tab: 'policy' };
  if (/timeout/i.test(message)) return { field: 'policy.timeoutMs', tab: 'policy' };
  return null;
}

export function RouteFormPage() {
  const params = useParams();
  const editingId = params.routeId ? Number(params.routeId) : null;
  return editingId == null ? <RouteForm /> : <EditRouteLoader id={editingId} />;
}

function EditRouteLoader({ id }: { id: number }) {
  const route = useRoute(id);
  const crumbs = [{ label: 'My routes', to: '/tenant/routes' }, { label: 'Edit route' }];
  if (route.isPending) {
    return (
      <>
        <PageHeader title="Edit route" breadcrumbs={crumbs} />
        <LoadingBlock rows={6} label="Loading route" />
      </>
    );
  }
  if (route.isError) {
    return (
      <>
        <PageHeader title="Edit route" breadcrumbs={crumbs} />
        <ErrorState error={route.error} onRetry={() => route.refetch()} />
      </>
    );
  }
  return <RouteForm route={route.data} />;
}

function RouteForm({ route }: { route?: Route }) {
  const editing = Boolean(route);
  const navigate = useNavigate();
  const toast = useToast();
  const create = useCreateRoute();
  const update = useUpdateRoute(route?.id ?? -1);
  const [tab, setTab] = useState<TabId>('general');
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<RouteFormValues>({
    resolver: zodResolver(routeFormSchema),
    defaultValues: route ? routeToForm(route) : DEFAULT_ROUTE_FORM,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });
  const { register, handleSubmit, control, setError, formState } = form;
  const errors = formState.errors;
  const allowedMethods = useWatch({ control, name: 'allowedMethods' });
  const errorTabs = tabsWithErrors(errors);

  useEffect(() => {
    if (route) form.reset(routeToForm(route));
  }, [route, form]);

  const onValid = async (values: RouteFormValues) => {
    setServerError(null);
    const request = formToRouteRequest(values);
    try {
      const saved = editing ? await update.mutateAsync(request) : await create.mutateAsync(request);
      toast.success(editing ? 'Route saved' : 'Route created', `Configuration version ${saved.configurationVersion}`);
      navigate(`/tenant/routes/${saved.id}`);
    } catch (error) {
      if (!isApiError(error)) {
        setServerError('Saving failed. Try again.');
        return;
      }
      if (error.kind === 'conflict' && /route identifier/i.test(error.message)) {
        setError('routeId', { message: error.message });
        setTab('general');
        return;
      }
      if (error.kind === 'validation') {
        const target = fieldForServerMessage(error.message);
        if (target) {
          setError(target.field as never, { message: error.message });
          setTab(target.tab);
          return;
        }
      }
      setServerError(error.message);
    }
  };

  const onInvalid = (invalid: FieldErrors<RouteFormValues>) => {
    const order: TabId[] = ['general', 'routing', 'policy', 'headers'];
    const first = order.find((id) => tabsWithErrors(invalid).has(id));
    if (first) setTab(first);
  };

  const title = editing ? `Edit ${route?.name}` : 'Create route';
  const crumbs = [
    { label: 'My routes', to: '/tenant/routes' },
    ...(route ? [{ label: route.name, to: `/tenant/routes/${route.id}` }] : []),
    { label: editing ? 'Edit' : 'New route' },
  ];

  return (
    <FormProvider {...form}>
      <PageHeader
        title={title}
        breadcrumbs={crumbs}
        description={
          editing
            ? `Saving creates configuration version ${(route?.configurationVersion ?? 0) + 1} and publishes it to the gateway.`
            : 'Routes belong to your organization. The gateway picks up changes through configuration events.'
        }
      />
      <form onSubmit={handleSubmit(onValid, onInvalid)} noValidate>
        <Card>
          <Tabs
            label="Route sections"
            value={tab}
            onChange={(id) => setTab(id as TabId)}
            className="px-3"
            items={[
              { id: 'general', label: 'General', invalid: errorTabs.has('general') },
              { id: 'routing', label: 'Routing', invalid: errorTabs.has('routing') },
              { id: 'policy', label: 'Policy', invalid: errorTabs.has('policy') },
              { id: 'headers', label: 'Headers', invalid: errorTabs.has('headers') },
            ]}
          />
          <CardBody className="py-5">
            {serverError ? <InlineAlert tone="danger" className="mb-5" title="The server rejected this route">{serverError}</InlineAlert> : null}

            <div role="tabpanel" hidden={tab !== 'general'} className="flex max-w-2xl flex-col gap-4">
              <Field label="Route ID" htmlFor="routeId" required error={errors.routeId?.message} hint="Unique within your organization. Used in analytics and rate-limit keys.">
                <Input id="routeId" mono invalid={Boolean(errors.routeId)} placeholder="catalog" {...register('routeId')} />
              </Field>
              <Field label="Name" htmlFor="name" required error={errors.name?.message}>
                <Input id="name" invalid={Boolean(errors.name)} placeholder="Catalog API" {...register('name')} />
              </Field>
              <Field label="Description" htmlFor="description" error={errors.description?.message}>
                <Textarea id="description" invalid={Boolean(errors.description)} {...register('description')} />
              </Field>
              <Switch label="Active" description="Only active routes are served by the gateway." {...register('active')} />
            </div>

            <div role="tabpanel" hidden={tab !== 'routing'} className="flex max-w-2xl flex-col gap-4">
              <Field label="Path pattern" htmlFor="pathPattern" required error={errors.pathPattern?.message} hint="Starts with /. Use /** to match everything below a prefix.">
                <Input id="pathPattern" mono invalid={Boolean(errors.pathPattern)} placeholder="/catalog/**" {...register('pathPattern')} />
              </Field>
              <Field label="Target URI" htmlFor="targetUri" required error={errors.targetUri?.message} hint="Absolute http:// or https:// address of the upstream service.">
                <Input id="targetUri" mono invalid={Boolean(errors.targetUri)} placeholder="http://catalog:8082" {...register('targetUri')} />
              </Field>
              <Switch
                label="Strip matched prefix"
                description="Removes the matched prefix before forwarding. Ignored when path rewriting is on."
                {...register('stripPrefix')}
              />
              <div role="group" aria-labelledby="methods-label">
                <p id="methods-label" className="mb-2 text-[13px] font-medium text-fg">
                  Allowed methods<span className="ml-0.5 text-danger-fg" aria-hidden>*</span>
                </p>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {HTTP_METHODS.map((method) => (
                    <Checkbox key={method} value={method} label={<span className="font-mono text-[12.5px]">{method}</span>} {...register('allowedMethods')} />
                  ))}
                </div>
                {errors.allowedMethods?.message ? <p role="alert" className="mt-1.5 text-[12.5px] text-danger-fg">{errors.allowedMethods.message}</p> : null}
              </div>
            </div>

            <div role="tabpanel" hidden={tab !== 'policy'} className="max-w-3xl">
              <PolicyFields allowedMethods={allowedMethods ?? []} />
            </div>

            <div role="tabpanel" hidden={tab !== 'headers'} className="max-w-4xl">
              <HeaderRulesFields />
            </div>
          </CardBody>
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-3">
            <Button variant="ghost" onClick={() => navigate(route ? `/tenant/routes/${route.id}` : '/tenant/routes')} disabled={formState.isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={formState.isSubmitting}>
              {editing ? 'Save route' : 'Create route'}
            </Button>
          </div>
        </Card>
      </form>
    </FormProvider>
  );
}
