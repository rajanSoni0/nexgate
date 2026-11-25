import { z } from 'zod';

/**
 * Mirrors TenantAdminRequest: username @NotBlank @Size(max=100),
 * password @NotBlank @Size(min=8, max=100). The backend requires a password on
 * every update, so updates also require explicit acknowledgement that the
 * current password will be replaced.
 */
export function tenantAdminSchema(requireAcknowledgement: boolean) {
  return z
    .object({
      username: z.string().trim().min(1, 'Enter a username').max(100, 'Use 100 characters or fewer'),
      password: z.string().min(8, 'Use at least 8 characters').max(100, 'Use 100 characters or fewer'),
      confirmPassword: z.string(),
      enabled: z.boolean(),
      acknowledge: z.boolean(),
    })
    .superRefine((values, ctx) => {
      if (values.password !== values.confirmPassword) {
        ctx.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'Passwords don’t match' });
      }
      if (requireAcknowledgement && !values.acknowledge) {
        ctx.addIssue({ code: 'custom', path: ['acknowledge'], message: 'Confirm that the current password will be replaced' });
      }
    });
}

export type TenantAdminFormValues = z.infer<ReturnType<typeof tenantAdminSchema>>;
