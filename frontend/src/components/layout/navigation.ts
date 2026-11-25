import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  BarChart3,
  Building2,
  ClipboardList,
  Database,
  GitCompareArrows,
  LayoutDashboard,
  Network,
  PieChart,
  Route as RouteIcon,
  Settings,
  ShieldCheck,
  UserCog,
  UserRound,
} from 'lucide-react';
import type { ConsoleRole } from '@/types/api';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  /** Match only the exact path (for overview links). */
  end?: boolean;
}

export interface NavSection {
  label?: string;
  items: NavItem[];
}

const platform: NavSection[] = [
  { items: [{ label: 'Overview', to: '/platform', icon: LayoutDashboard, end: true }] },
  {
    label: 'Management',
    items: [
      { label: 'Organizations', to: '/platform/organizations', icon: Building2 },
      { label: 'Tenant administrators', to: '/platform/tenant-admins', icon: UserCog },
    ],
  },
  {
    label: 'API management',
    items: [
      { label: 'Routes', to: '/platform/routes', icon: RouteIcon },
      { label: 'Configuration versions', to: '/platform/versions', icon: GitCompareArrows },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { label: 'Platform analytics', to: '/platform/analytics', icon: BarChart3, end: true },
      { label: 'Organization analytics', to: '/platform/analytics/organizations', icon: PieChart },
    ],
  },
  {
    label: 'Monitoring',
    items: [
      { label: 'Service health', to: '/platform/monitoring/services', icon: Activity },
      { label: 'Infrastructure health', to: '/platform/monitoring/infrastructure', icon: Database },
    ],
  },
  {
    label: 'Administration',
    items: [
      { label: 'Audit logs', to: '/platform/audit', icon: ClipboardList },
      { label: 'Settings', to: '/platform/settings', icon: Settings },
    ],
  },
];

const tenant: NavSection[] = [
  { items: [{ label: 'Overview', to: '/tenant', icon: LayoutDashboard, end: true }] },
  {
    label: 'API management',
    items: [
      { label: 'My routes', to: '/tenant/routes', icon: RouteIcon },
      { label: 'Route policies', to: '/tenant/policies', icon: ShieldCheck },
      { label: 'Configuration versions', to: '/tenant/versions', icon: GitCompareArrows },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { label: 'API analytics', to: '/tenant/analytics', icon: BarChart3, end: true },
      { label: 'Route analytics', to: '/tenant/analytics/routes', icon: Network },
    ],
  },
  {
    label: 'Organization',
    items: [{ label: 'Organization details', to: '/tenant/organization', icon: Building2 }],
  },
];

export function navigationFor(role: ConsoleRole): NavSection[] {
  return role === 'PLATFORM_ADMIN' ? platform : tenant;
}

export function profilePathFor(role: ConsoleRole): string {
  return role === 'PLATFORM_ADMIN' ? '/platform/profile' : '/tenant/profile';
}

export const ProfileIcon = UserRound;
