import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { Checkbox, Field, Input, Select, Switch } from '@/components/ui/Form';
import { InlineAlert } from '@/components/ui/Feedback';
import { APPLICATION_ROLES, RATE_LIMIT_SCOPES } from '@/types/api';
import type { PolicyFormValues } from './schema';

type WithPolicy = { policy: PolicyFormValues };

const scopeLabels: Record<string, string> = { ROUTE: 'Route', USER: 'User', TENANT: 'Tenant', IP: 'IP address' };
const scopeHints: Record<string, string> = {
  '': 'Not set. The gateway counts all callers together, as for Route.',
  ROUTE: 'One shared counter for every caller of this route.',
  USER: 'A separate counter per authenticated user (JWT subject).',
  TENANT: 'One counter for the organization that owns the route.',
  IP: 'A separate counter per client IP address.',
};

/** Policy editor shared by the route form and the policy-only dialog. */
export function PolicyFields({ allowedMethods }: { allowedMethods: string[] }) {
  const { register, control, formState } = useFormContext<WithPolicy>();
  const errors = formState.errors.policy;
  const policy = useWatch({ control, name: 'policy' });
  const postAllowed = allowedMethods.some((method) => method.toUpperCase() === 'POST');

  return (
    <div className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-semibold text-fg">Authentication</legend>
        <Switch
          label="Require a bearer token"
          description="The gateway validates the NexGate JWT before forwarding."
          {...register('policy.authenticationRequired')}
        />
        <Controller
          control={control}
          name="policy.permittedRoles"
          render={({ field }) => (
            <div role="group" aria-labelledby="permitted-roles-label" className="flex flex-col gap-2">
              <p id="permitted-roles-label" className="text-[13px] font-medium text-fg">
                Permitted roles
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {APPLICATION_ROLES.map((role) => (
                  <Checkbox
                    key={role}
                    label={<span className="font-mono text-[12.5px]">{role}</span>}
                    checked={field.value.includes(role)}
                    disabled={!policy?.authenticationRequired}
                    onChange={(event) =>
                      field.onChange(event.target.checked ? [...field.value, role].sort() : field.value.filter((value) => value !== role))
                    }
                  />
                ))}
              </div>
              {errors?.permittedRoles?.message ? <p role="alert" className="text-[12.5px] text-danger-fg">{errors.permittedRoles.message}</p> : null}
            </div>
          )}
        />
        {policy?.authenticationRequired && policy.permittedRoles.length === 0 ? (
          <InlineAlert tone="warning">
            With authentication required and no permitted roles, the gateway rejects every request to this route with 403.
          </InlineAlert>
        ) : null}
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-semibold text-fg">Rate limiting</legend>
        <Switch label="Limit request rate" description="Fixed-window counter in Redis. If Redis is down, limited routes fail closed." {...register('policy.rateLimitEnabled')} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Requests per window" htmlFor="rl-requests" error={errors?.rateLimitRequests?.message}>
            <Input id="rl-requests" inputMode="numeric" disabled={!policy?.rateLimitEnabled} invalid={Boolean(errors?.rateLimitRequests)} {...register('policy.rateLimitRequests')} />
          </Field>
          <Field label="Window (seconds)" htmlFor="rl-window" error={errors?.rateLimitWindowSeconds?.message}>
            <Input id="rl-window" inputMode="numeric" disabled={!policy?.rateLimitEnabled} invalid={Boolean(errors?.rateLimitWindowSeconds)} {...register('policy.rateLimitWindowSeconds')} />
          </Field>
          <Field label="Scope" htmlFor="rl-scope" error={errors?.rateLimitScope?.message} hint={scopeHints[policy?.rateLimitScope ?? ''] ?? undefined}>
            <Select id="rl-scope" disabled={!policy?.rateLimitEnabled} {...register('policy.rateLimitScope')}>
              <option value="">Not set</option>
              {RATE_LIMIT_SCOPES.map((scope) => (
                <option key={scope} value={scope}>
                  {scopeLabels[scope]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-semibold text-fg">Reliability</legend>
        <Field label="Upstream timeout (ms)" htmlFor="timeout" required error={errors?.timeoutMs?.message} hint="Between 1 and 300000." className="sm:max-w-xs">
          <Input id="timeout" inputMode="numeric" invalid={Boolean(errors?.timeoutMs)} {...register('policy.timeoutMs')} />
        </Field>
        <Switch
          label="POST idempotency"
          description={
            postAllowed
              ? 'POST requests must send an Idempotency-Key header; duplicates replay the saved response.'
              : 'Requires POST in the allowed methods.'
          }
          {...register('policy.idempotencyEnabled')}
        />
        {errors?.idempotencyEnabled?.message ? <p role="alert" className="text-[12.5px] text-danger-fg">{errors.idempotencyEnabled.message}</p> : null}
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-semibold text-fg">Path rewriting</legend>
        <Switch
          label="Rewrite the upstream path"
          description="Replaces the matched prefix with the target prefix. Takes precedence over “strip prefix”."
          {...register('policy.rewriteEnabled')}
        />
        <Field
          label="Target prefix"
          htmlFor="rewrite-prefix"
          error={errors?.rewriteTargetPrefix?.message}
          hint="For example, /api/catalog turns /catalog/items into /api/catalog/items."
          className="sm:max-w-md"
        >
          <Input id="rewrite-prefix" mono disabled={!policy?.rewriteEnabled} invalid={Boolean(errors?.rewriteTargetPrefix)} {...register('policy.rewriteTargetPrefix')} />
        </Field>
      </fieldset>
    </div>
  );
}
