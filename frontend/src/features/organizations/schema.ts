import { z } from 'zod';

/** Mirrors OrganizationRequest validation in api-management-service. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const organizationSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name').max(150, 'Use 150 characters or fewer'),
  slug: z
    .string()
    .trim()
    .min(1, 'Enter a slug')
    .max(100, 'Use 100 characters or fewer')
    .regex(SLUG_PATTERN, 'Use lowercase letters, numbers and single hyphens (for example acme-retail)'),
});

export type OrganizationFormValues = z.infer<typeof organizationSchema>;

/** Suggest a slug from a name; the user can still edit it. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
    .replace(/-+$/g, '');
}
