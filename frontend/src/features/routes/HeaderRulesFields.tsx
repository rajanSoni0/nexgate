import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { Button, IconButton } from '@/components/ui/Button';
import { EmptyState, InlineAlert } from '@/components/ui/Feedback';
import { Field, Input, Select } from '@/components/ui/Form';
import type { RouteFormValues } from './schema';

export function HeaderRulesFields() {
  const { control, register, formState } = useFormContext<RouteFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: 'headerRules' });
  const rules = useWatch({ control, name: 'headerRules' });
  const errors = formState.errors.headerRules;

  return (
    <div className="flex flex-col gap-4">
      <InlineAlert tone="info">
        Authorization, Cookie and Set-Cookie can’t be transformed. API Management rejects any rule that names them, including
        FORWARD rules for Authorization.
      </InlineAlert>

      {fields.length === 0 ? (
        <EmptyState title="No header transformations" description="Requests and responses pass through with their headers unchanged." className="py-6" />
      ) : (
        <ul className="flex flex-col gap-3">
          {fields.map((field, index) => {
            const action = rules?.[index]?.action;
            const needsValue = action === 'ADD' || action === 'MODIFY';
            const ruleErrors = errors?.[index];
            return (
              <li key={field.id} className="rounded-lg border border-line p-3.5">
                <div className="grid gap-3 sm:grid-cols-[8rem_8rem_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-start">
                  <Field label="Direction" htmlFor={`hr-dir-${index}`}>
                    <Select id={`hr-dir-${index}`} {...register(`headerRules.${index}.direction`)}>
                      <option value="REQUEST">Request</option>
                      <option value="RESPONSE">Response</option>
                    </Select>
                  </Field>
                  <Field label="Action" htmlFor={`hr-action-${index}`}>
                    <Select id={`hr-action-${index}`} {...register(`headerRules.${index}.action`)}>
                      <option value="ADD">Add</option>
                      <option value="MODIFY">Modify</option>
                      <option value="REMOVE">Remove</option>
                      <option value="FORWARD">Forward</option>
                    </Select>
                  </Field>
                  <Field label="Header name" htmlFor={`hr-name-${index}`} error={ruleErrors?.headerName?.message}>
                    <Input id={`hr-name-${index}`} mono placeholder="X-Tenant-Id" invalid={Boolean(ruleErrors?.headerName)} {...register(`headerRules.${index}.headerName`)} />
                  </Field>
                  <Field label={needsValue ? 'Value' : 'Value (not used)'} htmlFor={`hr-value-${index}`} error={ruleErrors?.headerValue?.message}>
                    <Input id={`hr-value-${index}`} mono disabled={!needsValue} invalid={Boolean(ruleErrors?.headerValue)} {...register(`headerRules.${index}.headerValue`)} />
                  </Field>
                  <IconButton label={`Remove header rule ${index + 1}`} className="sm:mt-6" onClick={() => remove(index)}>
                    <Trash2 className="size-4" />
                  </IconButton>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div>
        <Button size="sm" icon={<Plus className="size-3.5" />} onClick={() => append({ direction: 'REQUEST', action: 'ADD', headerName: '', headerValue: '' })}>
          Add header rule
        </Button>
      </div>
    </div>
  );
}
