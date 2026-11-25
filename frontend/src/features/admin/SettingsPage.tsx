import { Monitor, Moon, Sun } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { InlineAlert } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/Page';
import { Table, TBody, Td, Th, THead } from '@/components/ui/Table';
import { SERVICES } from '@/config/services';
import { cn } from '@/lib/cn';
import { useTheme, type ThemePreference } from '@/theme/ThemeProvider';

const themeOptions: Array<{ value: ThemePreference; label: string; icon: typeof Sun }> = [
  { value: 'system', label: 'Match system', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
];

export function ThemeChooser() {
  const { preference, setPreference } = useTheme();
  return (
    <div role="radiogroup" aria-label="Theme" className="flex flex-wrap gap-2">
      {themeOptions.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={preference === option.value}
          onClick={() => setPreference(option.value)}
          className={cn(
            'flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
            preference === option.value ? 'border-accent bg-accent-soft text-fg' : 'border-line-strong text-fg-muted hover:text-fg',
          )}
        >
          <option.icon className="size-4" aria-hidden />
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Console preferences and connection details." />
      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader title="Appearance" description="Stored in this browser only." />
          <CardBody>
            <ThemeChooser />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Service connections" description="The development server proxies these paths; change them in .env.local." />
          <Table minWidth={520}>
            <THead>
              <tr>
                <Th>Service</Th>
                <Th>Console path</Th>
                <Th>Proxy target</Th>
              </tr>
            </THead>
            <TBody>
              {Object.values(SERVICES).map((service) => (
                <tr key={service.base}>
                  <Td>{service.label}</Td>
                  <Td className="font-mono text-[12.5px]">{service.base}</Td>
                  <Td className="font-mono text-[12.5px] text-fg-muted">{service.upstream ?? 'default'}</Td>
                </tr>
              ))}
            </TBody>
          </Table>
        </Card>

        <InlineAlert tone="info" title="Platform settings">
          API Management exposes no platform-level settings endpoint, so there’s nothing server-side to configure here yet.
        </InlineAlert>
      </div>
    </>
  );
}
