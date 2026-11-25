import { lazy, Suspense, type ReactNode } from 'react';
import { Link, type RouteObject } from 'react-router-dom';
import { LoadingBlock } from '@/components/ui/Feedback';
import { AppShell } from '@/components/layout/AppShell';
import { LoginPage } from '@/features/auth/LoginPage';
import { RequireRole, RootRedirect } from '@/features/auth/guards';
import { AuditLogsPage } from '@/features/admin/AuditLogsPage';
import { SettingsPage } from '@/features/admin/SettingsPage';
import { OrganizationDetailPage } from '@/features/organizations/OrganizationDetailPage';
import { OrganizationsPage } from '@/features/organizations/OrganizationsPage';
import { PlatformOverviewPage } from '@/features/overview/PlatformOverviewPage';
import { TenantOverviewPage } from '@/features/overview/TenantOverviewPage';
import { ProfilePage } from '@/features/profile/ProfilePage';
import { TenantOrganizationPage } from '@/features/profile/TenantOrganizationPage';
import { RouteDetailPage } from '@/features/routes/RouteDetailPage';
import { RouteFormPage } from '@/features/routes/RouteFormPage';
import { RoutePoliciesPage } from '@/features/routes/RoutePoliciesPage';
import { RoutesListPage } from '@/features/routes/RoutesListPage';
import { VersionsIndexPage } from '@/features/routes/VersionsIndexPage';
import { TenantAdminsPage } from '@/features/tenant-admins/TenantAdminsPage';
import { OrganizationAnalyticsPage, TenantApiAnalyticsPage, TenantRouteAnalyticsPage } from '@/features/analytics/OtherAnalyticsPages';

// Chart- and probe-heavy pages load on demand (Recharts is the largest dependency).
const PlatformAnalyticsPage = lazy(() => import('@/features/analytics/PlatformAnalyticsPage').then((m) => ({ default: m.PlatformAnalyticsPage })));
const ServiceHealthPage = lazy(() => import('@/features/monitoring/HealthPages').then((m) => ({ default: m.ServiceHealthPage })));
const InfrastructureHealthPage = lazy(() => import('@/features/monitoring/HealthPages').then((m) => ({ default: m.InfrastructureHealthPage })));

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<LoadingBlock rows={6} label="Loading page" />}>{children}</Suspense>;
}

function NotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-lg font-semibold text-fg">Page not found</h1>
      <p className="mt-1 text-fg-muted">The address doesn’t match any console page.</p>
      <Link to="/" className="mt-4 inline-block text-accent-fg hover:underline">
        Go to your overview
      </Link>
    </div>
  );
}

export const appRoutes: RouteObject[] = [
  { path: '/', element: <RootRedirect /> },
  { path: '/login', element: <LoginPage /> },
  {
    path: '/platform',
    element: (
      <RequireRole role="PLATFORM_ADMIN">
        <AppShell />
      </RequireRole>
    ),
    children: [
      { index: true, element: <PlatformOverviewPage /> },
      { path: 'organizations', element: <OrganizationsPage /> },
      { path: 'organizations/:organizationId', element: <OrganizationDetailPage /> },
      { path: 'tenant-admins', element: <TenantAdminsPage /> },
      { path: 'routes', element: <RoutesListPage /> },
      { path: 'routes/:routeId', element: <RouteDetailPage /> },
      { path: 'versions', element: <VersionsIndexPage /> },
      { path: 'analytics', element: <Lazy><PlatformAnalyticsPage /></Lazy> },
      { path: 'analytics/organizations', element: <OrganizationAnalyticsPage /> },
      { path: 'monitoring/services', element: <Lazy><ServiceHealthPage /></Lazy> },
      { path: 'monitoring/infrastructure', element: <Lazy><InfrastructureHealthPage /></Lazy> },
      { path: 'audit', element: <AuditLogsPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
  {
    path: '/tenant',
    element: (
      <RequireRole role="TENANT_ADMIN">
        <AppShell />
      </RequireRole>
    ),
    children: [
      { index: true, element: <TenantOverviewPage /> },
      { path: 'routes', element: <RoutesListPage /> },
      { path: 'routes/new', element: <RouteFormPage /> },
      { path: 'routes/:routeId', element: <RouteDetailPage /> },
      { path: 'routes/:routeId/edit', element: <RouteFormPage /> },
      { path: 'policies', element: <RoutePoliciesPage /> },
      { path: 'versions', element: <VersionsIndexPage /> },
      { path: 'analytics', element: <TenantApiAnalyticsPage /> },
      { path: 'analytics/routes', element: <TenantRouteAnalyticsPage /> },
      { path: 'organization', element: <TenantOrganizationPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
  { path: '*', element: <RootRedirect /> },
];
