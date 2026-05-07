'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/hooks/use-profile'
import { NotificationBell } from '@/components/notification-bell'
import { MobileNav } from '@/components/mobile-nav'
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Spinner } from '@/components/ui/spinner'
import {
  LayoutDashboard,
  FileText,
  ClipboardCheck,
  Users,
  Building2,
  ScrollText,
  BellRing,
  LogOut,
  ChevronUp,
  Settings,
  Archive,
  Shield
} from 'lucide-react'

const userMenuItems = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Pengajuan RKA/DPA', href: '/dashboard/budgets', icon: FileText },
  { title: 'Notifikasi', href: '/dashboard/notifications', icon: BellRing },
]

const adminMenuItems = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Verifikasi RKA/DPA', href: '/dashboard/review', icon: ClipboardCheck },
  { title: 'Pengajuan RKA/DPA', href: '/dashboard/budgets', icon: FileText },
  { title: 'Notifikasi', href: '/dashboard/notifications', icon: BellRing },
]

const adminManagementItems = [
  { title: 'Kelola Pengguna', href: '/dashboard/users', icon: Users },
  { title: 'Kelola Instansi', href: '/dashboard/institutions', icon: Building2 },
  { title: 'Kelola Pengajuan', href: '/dashboard/manage-budgets', icon: Archive },
  { title: 'Audit Log', href: '/dashboard/audit-log', icon: ScrollText },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { profile, isLoading, isAdmin } = useProfile()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    // Force a hard reload to clear SWR cache and any lingering React state
    window.location.href = '/auth/login'
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="h-8 w-8 text-sky-500" />
          <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">Memuat Portal...</p>
        </div>
      </div>
    )
  }

  const menuItems = isAdmin ? adminMenuItems : userMenuItems
  const initials = profile?.institution?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || (isAdmin ? 'AD' : 'IN')

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" variant="sidebar">
        {/* Sidebar Header - Brand */}
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link href="/dashboard">
                  <div className="flex h-8 w-8 items-center justify-center bg-white rounded-lg p-1 shadow-sm"><Image src="/logo-anggaran-2.jpeg" alt="SIVRON" width={24} height={24} className="object-contain rounded-md" /></div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-heading font-bold tracking-wider">
                      SIVRON<span className="text-sky-500 text-xl leading-none">.</span>
                    </span>
                    <span className="truncate text-[9px] font-mono font-bold tracking-widest text-muted-foreground uppercase">
                      Sistem Verifikasi RKA Online
                    </span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarSeparator />

        {/* Main Navigation */}
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="font-mono text-[10px] tracking-widest uppercase">Menu Utama</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={
                        item.href === '/dashboard'
                          ? pathname === '/dashboard'
                          : pathname.startsWith(item.href)
                      }
                      tooltip={item.title}
                    >
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span className="font-medium text-sm">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Admin Management Section */}
          {isAdmin && (
            <SidebarGroup>
              <SidebarGroupLabel className="font-mono text-[10px] tracking-widest uppercase">Manajemen</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminManagementItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname.startsWith(item.href)}
                        tooltip={item.title}
                      >
                        <Link href={item.href}>
                          <item.icon className="h-4 w-4" />
                          <span className="font-medium text-sm">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>

        {/* Sidebar Footer - User */}
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton size="lg">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-sky-50 text-sky-600 text-xs font-bold border border-sky-100">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-bold">
                        {profile?.institution?.name || (isAdmin ? 'Administrator' : 'Instansi')}
                      </span>
                      <span className="truncate text-xs text-muted-foreground font-medium">
                        {isAdmin ? (profile?.admin_role || 'Admin') : 'User'}
                      </span>
                    </div>
                    <ChevronUp className="ml-auto h-4 w-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="top"
                  align="start"
                  className="w-56"
                >
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-bold">{profile?.institution?.name || (isAdmin ? 'Administrator' : 'Instansi')}</p>
                      <p className="text-xs font-medium text-muted-foreground">
                        {isAdmin ? (profile?.admin_role || 'Admin') : 'User'}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-sky-600 focus:text-sky-600 font-medium">
                    <LogOut className="mr-2 h-4 w-4" />
                    Keluar Sistem
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      {/* Main content area */}
      <SidebarInset>
        {/* Top header bar */}
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b bg-white/80 px-4 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 z-20 sticky top-0 shadow-sm">
          <div className="flex items-center gap-2 flex-1">
            <SidebarTrigger className="-ml-1 hidden md:flex" />
            <Separator orientation="vertical" className="mx-2 h-4 hidden md:block" />
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex h-7 w-7 items-center justify-center bg-white rounded p-0.5 shadow-sm md:hidden"><Image src="/logo-anggaran-2.jpeg" alt="SIVRON" width={20} height={20} className="object-contain rounded-sm" /></div>
              <h2 className="text-sm font-heading font-bold text-gray-900 tracking-wider flex items-center">
                SIVRON<span className="text-sky-500">.</span>
              </h2>
              <Separator orientation="vertical" className="mx-2 h-4 hidden sm:block" />
              <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase hidden sm:block font-bold mt-1">
                {new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex text-right mr-1 sm:mr-3">
              <p className="text-xs font-bold leading-none truncate max-w-[80px] sm:max-w-[150px] mt-0.5">
                Halo, {profile?.institution?.name?.split(' ')[0] || (isAdmin ? 'Admin' : 'Instansi')}
              </p>
            </div>
            <NotificationBell />
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-auto bg-gray-50/50 p-4 pb-24 md:p-8 md:pb-8">
          {children}
        </div>
      </SidebarInset>
      
      {/* Mobile Navigation */}
      <MobileNav />
    </SidebarProvider>
  )
}
