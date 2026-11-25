import { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, DetailList } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/Page';
import { formatDateTime, formatRelative, roleLabel } from '@/lib/format';
import { useAuth, useSession } from '@/features/auth/AuthProvider';
import { ThemeChooser } from '@/features/admin/SettingsPage';

export function ProfilePage() {
  const session = useSession();
  const { signOut } = useAuth();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <>
      <PageHeader
        title="Profile"
        description="Your account as the API Management service sees it."
        actions={
          <Button icon={<LogOut className="size-4" />} onClick={signOut}>
            Sign out
          </Button>
        }
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Account" />
          <CardBody>
            <DetailList
              items={[
                { label: 'Username', value: <span className="font-medium">{session.username}</span> },
                { label: 'Role', value: <Badge tone="accent">{roleLabel(session.role)}</Badge> },
                {
                  label: 'Organization',
                  value: session.organizationId != null ? <span className="font-mono text-[13px]">#{session.organizationId}</span> : 'Platform-wide',
                },
              ]}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Session" description="Tokens can’t be refreshed; sign in again after expiry." />
          <CardBody>
            <DetailList
              items={[
                { label: 'Signed in', value: formatDateTime(session.issuedAt) },
                { label: 'Expires', value: `${formatDateTime(session.expiresAt)} (${formatRelative(session.expiresAt, now)})` },
                { label: 'Stored in', value: 'Session storage for this tab. Cleared when the tab closes.' },
              ]}
            />
          </CardBody>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Appearance" />
          <CardBody>
            <ThemeChooser />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
