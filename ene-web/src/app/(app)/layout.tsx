import KBar from '@/components/kbar';
import AppSidebar from '@/components/layout/app-sidebar';
import Header from '@/components/layout/header';
import { RouteAccessGuard } from '@/components/layout/route-access-guard';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';

export const metadata: Metadata = {
  title: 'Extremo Norte Expediciones',
  description: 'Sistema de Gestión de Operaciones — Extremo Norte Expediciones',
  robots: {
    index: false,
    follow: false
  }
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Persiste el estado del sidebar en la cookie.
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get('sidebar_state')?.value !== 'false';
  return (
    <KBar>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar />
        <SidebarInset>
          <Header />
          <RouteAccessGuard>{children}</RouteAccessGuard>
        </SidebarInset>
      </SidebarProvider>
    </KBar>
  );
}
