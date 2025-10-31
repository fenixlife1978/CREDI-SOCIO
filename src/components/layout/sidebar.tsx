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
  LogOut,
  Sun,
  ShieldCheck,
  FileText,
  Receipt,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-provider';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/partners', label: 'Socios', icon: Users },
  { href: '/dashboard/loans', label: 'Préstamos', icon: Landmark },
  { href: '/dashboard/payments', label: 'Pagos', icon: DollarSign },
  { href: '/dashboard/receipts', label: 'Recibos', icon: Receipt },
  { href: '/dashboard/reports', label: 'Reportes', icon: FileText },
  { href: '/dashboard/validation', label: 'Validación', icon: ShieldCheck },
];

function AppLogo() {
  return (
    <div className="flex items-center gap-2 font-semibold text-lg text-sidebar-primary">
       <Image 
        src="https://www.shutterstock.com/image-vector/bus-logo-transportation-company-tour-600nw-2311818205.jpg" 
        alt="Logo"
        width={40}
        height={40}
        className="rounded-md"
        />
      <span className="group-data-[collapsible=icon]:hidden">COOP. LA CANDELARIA</span>
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
