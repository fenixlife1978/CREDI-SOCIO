'use client';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/sidebar';
import { AppHeader } from '@/components/layout/header';
import { useAuth as usePinAuth } from '@/lib/auth-provider'; // Renamed to avoid conflict
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { FirebaseClientProvider } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';


function DashboardContent({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = usePinAuth();
  const router = useRouter();

  useEffect(() => {
    // If the user is not authenticated with the PIN, redirect to lock screen
    if (!isAuthenticated) {
      router.push('/lock');
    }
  }, [isAuthenticated, router]);


  // While PIN auth is false, show a loading skeleton.
  if (!isAuthenticated) {
    return (
       <div className="flex h-screen w-screen">
          <div className="hidden md:block md:w-64 bg-sidebar p-4">
            <Skeleton className="h-10 w-full mb-4" />
            <div className="space-y-2">
              {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          </div>
          <div className="flex-1 flex flex-col">
            <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6">
                <Skeleton className="h-8 w-8 md:hidden" />
                <div className="w-full flex-1" />
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
            </header>
            <main className="flex-1 p-4 sm:p-6 bg-background">
                <Skeleton className="h-full w-full" />
            </main>
          </div>
        </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <main className="flex-1 p-4 sm:p-6 bg-background overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FirebaseClientProvider>
      <DashboardContent>{children}</DashboardContent>
    </FirebaseClientProvider>
  );
}
