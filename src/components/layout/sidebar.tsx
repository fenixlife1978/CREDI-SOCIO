'use client';

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Bus,
  DollarSign,
  ShieldCheck,
  FileText,
  Receipt,
  Settings,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-provider';
import Image from 'next/image';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/partners', label: 'Socios', icon: Users },
  { href: '/dashboard/loans', label: 'Préstamos', icon: Bus },
  { href: '/dashboard/payments', label: 'Pagos', icon: DollarSign },
  { href: '/dashboard/receipts', label: 'Recibos', icon: Receipt },
  { href: '/dashboard/reports', label: 'Reportes', icon: FileText },
  { href: '/dashboard/validation', label: 'Validación', icon: ShieldCheck },
  { href: '/dashboard/settings', label: 'Ajustes', icon: Settings },
];

function AppLogo() {
  return (
    <div className="flex items-center gap-2 font-semibold text-lg text-sidebar-primary">
      <div className="w-10 h-10 flex items-center justify-center bg-sidebar-primary text-sidebar-primary-foreground rounded-md overflow-hidden">
        <Bus className="h-6 w-6" />
      </div>
      <span className="group-data-[collapsible=icon]:hidden">Asoc. Coop. Transp. La Candelaria R.L.</span>
    </div>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader>
        <div
          className={cn(
            'flex h-14 w-full items-center px-4',
            'group-data-[collapsible=icon]:h-12 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0'
          )}
        >
            <AppLogo />
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                href={item.href}
                isActive={pathname.startsWith(item.href) && (item.href !== '/dashboard' || pathname === '/dashboard')}
                icon={<item.icon />}
                tooltip={{
                  children: item.label,
                  className: 'bg-primary text-primary-foreground',
                }}
              >
                <Link href={item.href}>
                  <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
