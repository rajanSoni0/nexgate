import { useMemo, useState } from 'react';
import { Eye, GitCompareArrows, History, RotateCcw } from 'lucide-react';
import { Badge, Code } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog, ConfirmDialog } from '@/components/ui/Dialog';
import { EmptyState, ErrorState, InlineAlert, LoadingBlock } from '@/components/ui/Feedback';
import { Field, Select } from '@/components/ui/Form';
import { Table, TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import { useToast } from '@/components/ui/Toast';
import { isApiError } from '@/lib/errors';
import { formatDateTime } from '@/lib/format';
import type { Route, RouteVersion } from '@/types/api';
import { useRestoreRouteVersion, useRouteComparison, useRouteVersions } from './hooks';

function changeTone(changeType: string) {
  if (changeType === 'CREATE') return 'accent' as const;
  if (changeType === 'DELETE' || changeType === 'DEACTIVATE') return 'danger' as const;
  if (changeType.startsWith('RESTORE')) return 'warning' as const;
  if (changeType === 'ACTIVATE') return 'success' as const;
  return 'neutral' as const;
}

function changeLabel(changeType: string) {
  if (changeType.startsWith('RESTORE:')) return `Restored v${changeType.slice(8)}`;
  return changeType.replace('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function display(value: unknown): string {
  if (value == null || value === '') return '—';
  if (Array.isArray(value)) return value.length ? value.join('\n') : '(none)';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function prettySnapshot(snapshot: string): string {
  try {
    return JSON.stringify(JSON.parse(snapshot), null, 2);
  } catch {
    return snapshot;
  }
}

export function VersionsPanel({ route, canRestore }: { route: Route; canRestore: boolean }) {
  const versions = useRouteVersions(route.id);
  const restore = useRestoreRouteVersion(route.id);
  const toast = useToast();
  const [from, setFrom] = useState<number | null>(null);
  const [to, setTo] = useState<number | null>(null);
  const [viewing, setViewing] = useState<RouteVersion | null>(null);
  const [restoring, setRestoring] = useState<RouteVersion | null>(null);

  const list = versions.data ?? [];
  const latest = list[0]?.versionNumber;
  const effectiveTo = to ?? latest ?? null;
  const effectiveFrom = from ?? (list[1]?.versionNumber ?? null);
  const comparison = useRouteComparison(route.id, effectiveFrom, effectiveTo);

  const options = useMemo(() => list.map((v) => ({ value: v.versionNumber, label: `v${v.versionNumber} (${changeLabel(v.changeType)})` })), [list]);

  if (versions.isPending) return <LoadingBlock rows={4} label="Loading versions" />;
  if (versions.isError) return <ErrorState error={versions.error} onRetry={() => versions.refetch()} />;
  if (list.length === 0) return <EmptyState icon={<History className="size-6" />} title="No versions recorded" />;

  return (
    <div className="flex flex-col gap-6">
      <section aria-label="Compare versions" className="rounded-lg border border-line">
        <div className="flex flex-wrap items-end gap-3 border-b border-line px-4 py-3">
          <Field label="From" htmlFor="cmp-from" className="w-full sm:w-56">
            <Select id="cmp-from" value={effectiveFrom ?? ''} onChange={(e) => setFrom(Number(e.target.value))}>
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <GitCompareArrows className="mb-2.5 hidden size-4 text-fg-subtle sm:block" aria-hidden />
          <Field label="To" htmlFor="cmp-to" className="w-full sm:w-56">
            <Select id="cmp-to" value={effectiveTo ?? ''} onChange={(e) => setTo(Number(e.target.value))}>
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="p-4">
          {list.length < 2 ? (
            <p className="text-[13px] text-fg-muted">Only one version exists, so there’s nothing to compare yet.</p>
          ) : effectiveFrom === effectiveTo ? (
            <p className="text-[13px] text-fg-muted">Choose two different versions.</p>
          ) : comparison.isPending ? (
            <LoadingBlock rows={2} label="Comparing versions" />
          ) : comparison.isError ? (
            <ErrorState error={comparison.error} onRetry={() => comparison.refetch()} compact />
          ) : comparison.data.differences.length === 0 ? (
            <p className="text-[13px] text-fg-muted">
              No configuration differences between v{comparison.data.fromVersion} and v{comparison.data.toVersion}.
            </p>
          ) : (
            <Table minWidth={560}>
              <THead>
                <tr>
                  <Th>Field</Th>
                  <Th>v{comparison.data.fromVersion}</Th>
                  <Th>v{comparison.data.toVersion}</Th>
                </tr>
              </THead>
              <TBody>
                {comparison.data.differences.map((difference) => (
                  <tr key={difference.field}>
                    <Td className="align-top">
                      <Code>{difference.field}</Code>
                    </Td>
                    <Td className="align-top">
                      <pre className="font-mono text-[12.5px] whitespace-pre-wrap break-all text-danger-fg">{display(difference.from)}</pre>
                    </Td>
                    <Td className="align-top">
                      <pre className="font-mono text-[12.5px] whitespace-pre-wrap break-all text-success-fg">{display(difference.to)}</pre>
                    </Td>
                  </tr>
                ))}
              </TBody>
            </Table>
          )}
        </div>
      </section>

      <section aria-label="Version history">
        <Table>
          <THead>
            <tr>
              <Th>Version</Th>
              <Th>Change</Th>
              <Th>By</Th>
              <Th>When</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </THead>
          <TBody>
            {list.map((version) => (
              <Tr key={version.id}>
                <Td className="font-mono">
                  v{version.versionNumber}
                  {version.versionNumber === route.configurationVersion ? (
                    <Badge tone="accent" className="ml-2 font-sans">
                      Current
                    </Badge>
                  ) : null}
                </Td>
                <Td>
                  <Badge tone={changeTone(version.changeType)}>{changeLabel(version.changeType)}</Badge>
                </Td>
                <Td>{version.createdBy}</Td>
                <Td className="text-fg-muted">{formatDateTime(version.createdAt)}</Td>
                <Td>
                  <div className="flex justify-end gap-1.5">
                    <Button size="sm" variant="ghost" icon={<Eye className="size-3.5" />} onClick={() => setViewing(version)}>
                      Snapshot
                    </Button>
                    {canRestore && version.versionNumber !== route.configurationVersion ? (
                      <Button size="sm" variant="ghost" icon={<RotateCcw className="size-3.5" />} onClick={() => setRestoring(version)}>
                        Restore
                      </Button>
                    ) : null}
                  </div>
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </section>

      <Dialog open={viewing != null} onClose={() => setViewing(null)} size="lg" title={viewing ? `Snapshot v${viewing.versionNumber}` : ''} description="The full route configuration stored for this version.">
        {viewing ? (
          <pre className="max-h-[60vh] overflow-auto rounded-md bg-surface-2 p-3 font-mono text-[12.5px] text-fg">{prettySnapshot(viewing.configurationSnapshot)}</pre>
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={restoring != null}
        title={restoring ? `Restore version ${restoring.versionNumber}?` : ''}
        description={`The route’s configuration is replaced with this snapshot and saved as version ${route.configurationVersion + 1}. History is kept.`}
        confirmLabel="Restore version"
        loading={restore.isPending}
        onClose={() => setRestoring(null)}
        onConfirm={() =>
          restoring &&
          restore.mutate(restoring.versionNumber, {
            onSuccess: (updated) => {
              toast.success(`Restored v${restoring.versionNumber}`, `Now at configuration version ${updated.configurationVersion}`);
              setRestoring(null);
            },
            onError: (error) => toast.error('Couldn’t restore the version', isApiError(error) ? error.message : undefined),
          })
        }
      >
        {restoring && /"active"\s*:\s*(true|false)/.exec(restoring.configurationSnapshot)?.[1] !== String(route.active) ? (
          <InlineAlert tone="warning">This snapshot also changes whether the route is active.</InlineAlert>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}
