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
  Landmark,
  DollarSign,
  ShieldAlert,
  Settings,
  LogOut
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-provider';
import { useRouter } from 'next/navigation';
import { Button } from '../ui/button';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/partners', label: 'Socios', icon: Users },
  { href: '/dashboard/loans', label: 'Préstamos', icon: Landmark },
  { href: '/dashboard/payments', label: 'Pagos', icon: DollarSign },
  { href: '/dashboard/validation', label: 'Validación', icon: ShieldAlert },
];

function CrediManageLogo() {
  return (
    <div className="flex items-center gap-2 font-semibold text-lg text-primary">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-7 w-7"
      >
        <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
        <path d="M2 17l10 5 10-5"></path>
        <path d="M2 12l10 5 10-5"></path>
      </svg>
      <span>CrediManage</span>
    </div>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/lock');
  }

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader>
        <div
          className={cn(
            'flex h-10 w-full items-center px-2',
            'group-data-[collapsible=icon]:h-12 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0'
          )}
        >
          <div className="group-data-[collapsible=icon]:hidden">
            <CrediManageLogo />
          </div>
          <div className="hidden group-data-[collapsible=icon]:block">
             <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-7 w-7 text-primary"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                <path d="M2 17l10 5 10-5"></path>
                <path d="M2 12l10 5 10-5"></path>
              </svg>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                as={Link}
                href={item.href}
                isActive={pathname === item.href}
                icon={<item.icon />}
                tooltip={{
                  children: item.label,
                  className: 'bg-primary text-primary-foreground',
                }}
              >
                <span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <div className='p-2 mt-auto'>
        <SidebarMenu>
          <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                icon={<Settings />}
                tooltip={{
                  children: "Ajustes",
                  className: 'bg-primary text-primary-foreground',
                }}
              >
                <Link href="#">
                  <span>Ajustes</span>
                </Link>
              </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
              <SidebarMenuButton
                onClick={handleLogout}
                icon={<LogOut />}
                tooltip={{
                  children: "Cerrar sesión",
                  className: 'bg-primary text-primary-foreground',
                }}
              >
                <span>Cerrar sesión</span>
              </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </div>
    </Sidebar>
  );
}
