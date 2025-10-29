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
  Settings,
  LogOut,
  Sun
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-provider';
import { useRouter } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/partners', label: 'Socios', icon: Users },
  { href: '/dashboard/loans', label: 'Préstamos', icon: Landmark },
  { href: '/dashboard/payments/register', label: 'Pagos', icon: DollarSign },
];

function CrediManageLogo() {
  return (
    <div className="flex items-center gap-2 font-semibold text-lg text-sidebar-primary">
       <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
        <div className="w-4 h-4 rounded-full bg-sidebar-background" />
      </div>
      <span className="group-data-[collapsible=icon]:hidden">LOAN MANAGER</span>
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
            'flex h-14 w-full items-center px-4',
            'group-data-[collapsible=icon]:h-12 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0'
          )}
        >
            <CrediManageLogo />
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
      <div className='p-2 mt-auto'>
        <SidebarMenu>
          <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                icon={<Sun />}
                tooltip={{
                  children: "Modo claro",
                  className: 'bg-primary text-primary-foreground',
                }}
              >
                <Link href="#">
                  <span className="group-data-[collapsible=icon]:hidden">Modo claro</span>
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
                <span className="group-data-[collapsible=icon]:hidden">Cerrar sesión</span>
              </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </div>
    </Sidebar>
  );
}
