import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { InlineAlert } from '@/components/ui/Feedback';
import { Field, Input } from '@/components/ui/Form';
import { isApiError } from '@/lib/errors';
import type { Organization, OrganizationRequest } from '@/types/api';
import { organizationSchema, slugify, type OrganizationFormValues } from './schema';

interface Props {
  open: boolean;
  onClose: () => void;
  organization?: Organization;
  onSubmit: (request: OrganizationRequest) => Promise<unknown>;
}

export function OrganizationFormDialog({ open, onClose, organization, onSubmit }: Props) {
  const editing = Boolean(organization);
  const [serverError, setServerError] = useState<string | null>(null);
  const slugTouched = useRef(editing);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationSchema),
    defaultValues: { name: organization?.name ?? '', slug: organization?.slug ?? '' },
  });

  useEffect(() => {
    if (open) {
      reset({ name: organization?.name ?? '', slug: organization?.slug ?? '' });
      slugTouched.current = editing;
      setServerError(null);
    }
  }, [open, organization, editing, reset]);

  const name = watch('name');
  useEffect(() => {
    if (!slugTouched.current) setValue('slug', slugify(name ?? ''), { shouldValidate: false });
  }, [name, setValue]);

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await onSubmit({ name: values.name.trim(), slug: values.slug.trim() });
      onClose();
    } catch (error) {
      if (isApiError(error) && error.kind === 'conflict') {
        if (/slug/i.test(error.message)) setError('slug', { message: error.message });
        else if (/name/i.test(error.message)) setError('name', { message: error.message });
        else setServerError(error.message);
      } else {
        setServerError(isApiError(error) ? error.message : 'Saving failed. Try again.');
      }
    }
  });

  const slugField = register('slug');

  return (
    <Dialog
      open={open}
      onClose={onClose}
      busy={isSubmitting}
      title={editing ? 'Edit organization' : 'Create organization'}
      description={editing ? undefined : 'New organizations start as Pending. Activate one before its tenant administrator can sign in.'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="organization-form" loading={isSubmitting}>
            {editing ? 'Save changes' : 'Create organization'}
          </Button>
        </>
      }
    >
      <form id="organization-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        {serverError ? <InlineAlert tone="danger">{serverError}</InlineAlert> : null}
        <Field label="Name" htmlFor="org-name" error={errors.name?.message} required>
          <Input id="org-name" data-autofocus invalid={Boolean(errors.name)} {...register('name')} />
        </Field>
        <Field
          label="Slug"
          htmlFor="org-slug"
          required
          error={errors.slug?.message}
          hint="Lowercase letters, numbers and single hyphens. Must be unique."
        >
          <Input
            id="org-slug"
            mono
            invalid={Boolean(errors.slug)}
            {...slugField}
            onChange={(event) => {
              slugTouched.current = true;
              return slugField.onChange(event);
            }}
          />
        </Field>
      </form>
    </Dialog>
  );
}
