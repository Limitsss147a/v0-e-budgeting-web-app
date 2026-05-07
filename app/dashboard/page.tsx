'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/hooks/use-profile'
import { formatCurrency, formatCompactNumber, formatDate } from '@/lib/format'
import { statusConfig, type Budget, type BudgetStatus } from '@/lib/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Bar, BarChart, XAxis, YAxis, Pie, PieChart, Cell, ResponsiveContainer } from 'recharts'
import {
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  TrendingUp,
  Building2,
  ArrowUpRight,
  Shield,
  Activity
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'

interface DashboardStats {
  total: number
  submitted: number
  underReview: number
  revision: number
  approved: number
  rejected: number
  draft: number
  totalAmount: number
  approvedAmount: number
}

const statusChartConfig: ChartConfig = {
  draft: { label: 'Draft', color: 'var(--color-muted-foreground)' },
  submitted: { label: 'Diajukan', color: 'var(--color-chart-1)' },
  under_review: { label: 'Ditinjau', color: 'var(--color-chart-3)' },
  revision: { label: 'Revisi', color: 'var(--color-chart-4)' },
  approved: { label: 'Disetujui', color: 'var(--color-chart-2)' },
  rejected: { label: 'Ditolak', color: 'var(--color-destructive)' },
}

export default function DashboardPage() {
  const { profile, isAdmin, isLoading: profileLoading } = useProfile()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentBudgets, setRecentBudgets] = useState<Budget[]>([])
  const [statusData, setStatusData] = useState<{ status: string; count: number; fill: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!profileLoading && profile) {
      fetchDashboardData()
    }
  }, [profileLoading, profile])

  async function fetchDashboardData() {
    const supabase = createClient()
    setIsLoading(true)

    try {
      if (!profile) return

      // 1. Fetch dashboard stats via RPC (Server-side aggregation)
      const { data: statsData, error: statsError } = await supabase.rpc('get_dashboard_stats', {
        user_id: profile.id,
        is_admin_user: isAdmin
      })

      if (statsError) throw statsError

      if (statsData) {
        const s = statsData.summary
        setStats({
          total: Number(s.total_count),
          submitted: Number(s.submitted_count),
          underReview: Number(s.under_review_count),
          revision: Number(s.revision_count),
          approved: Number(s.approved_count),
          rejected: Number(s.rejected_count),
          draft: Number(s.draft_count),
          totalAmount: Number(s.grand_total_amount),
          approvedAmount: Number(s.approved_total_amount),
        })

        // Map status distribution for chart
        const chartData = (statsData.status_distribution || [])
          .map((item: any) => {
            const config = statusChartConfig[item.status as keyof typeof statusChartConfig]
            return {
              status: config?.label || item.status,
              count: Number(item.count),
              fill: config?.color || 'var(--color-muted-foreground)',
            }
          })
          .filter((d: any) => d.count > 0)
        
        setStatusData(chartData)
      }

      // 2. Fetch only the 5 most recent budgets
      const { data: recentData } = await supabase
        .from('budgets')
        .select('*, institution:institutions(name, code)')
        .order('updated_at', { ascending: false })
        .limit(5)

      if (recentData) {
        setRecentBudgets(recentData as Budget[])
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (profileLoading || isLoading) {
    return <DashboardSkeleton />
  }

  const statCards = isAdmin
    ? [
        {
          title: 'Total Pengajuan',
          value: stats?.total || 0,
          icon: FileText,
          description: 'Seluruh pengajuan',
          color: 'text-blue-600',
          bg: 'bg-blue-50 border-blue-100',
          gradient: 'from-blue-500',
        },
        {
          title: 'Perlu Verifikasi',
          value: (stats?.submitted || 0) + (stats?.underReview || 0),
          icon: Clock,
          description: 'Menunggu ditinjau',
          color: 'text-amber-600',
          bg: 'bg-amber-50 border-amber-100',
          gradient: 'from-amber-500',
        },
        {
          title: 'Telah Disetujui',
          value: stats?.approved || 0,
          icon: CheckCircle2,
          description: formatCurrency(stats?.approvedAmount || 0),
          color: 'text-emerald-600',
          bg: 'bg-emerald-50 border-emerald-100',
          gradient: 'from-emerald-500',
        },
        {
          title: 'SIVRON Total Anggaran',
          value: formatCompactNumber(stats?.totalAmount || 0),
          icon: Shield,
          description: 'Seluruh alokasi tercatat',
          color: 'text-sky-600',
          bg: 'bg-sky-50 border-sky-100',
          isText: true,
          gradient: 'from-sky-600',
        },
      ]
    : [
        {
          title: 'Total Pengajuan',
          value: stats?.total || 0,
          icon: FileText,
          description: 'Pengajuan Anda',
          color: 'text-blue-600',
          bg: 'bg-blue-50 border-blue-100',
          gradient: 'from-blue-500',
        },
        {
          title: 'Disetujui',
          value: stats?.approved || 0,
          icon: CheckCircle2,
          description: formatCurrency(stats?.approvedAmount || 0),
          color: 'text-emerald-600',
          bg: 'bg-emerald-50 border-emerald-100',
          gradient: 'from-emerald-500',
        },
        {
          title: 'Perlu Revisi',
          value: stats?.revision || 0,
          icon: AlertCircle,
          description: 'Segera perbaiki proposal',
          color: 'text-amber-600',
          bg: 'bg-amber-50 border-amber-100',
          gradient: 'from-amber-500',
        },
        {
          title: 'Ditolak',
          value: stats?.rejected || 0,
          icon: XCircle,
          description: 'Tidak dapat diproses',
          color: 'text-red-600',
          bg: 'bg-red-50 border-red-100',
          gradient: 'from-red-600',
        },
      ]

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-5 w-5 text-sky-500" />
            <h1 className="font-heading text-3xl font-bold tracking-tight text-gray-900">Portal Dashboard</h1>
          </div>
          <p className="text-muted-foreground font-medium flex items-center">
            Selamat datang, <span className="text-gray-900 font-bold ml-1 mr-1">{profile?.institution?.name?.split(' ')[0] || (isAdmin ? 'Admin' : 'User')}!</span>
            {profile?.institution?.name && (
               <span className="hidden sm:inline-flex items-center text-xs font-mono uppercase bg-gray-100 px-2 py-0.5 rounded text-gray-600 ml-2">
                  <Building2 className="w-3 h-3 mr-1" /> {profile.institution.name}
               </span>
            )}
          </p>
        </div>
        {!isAdmin && (
          <Button asChild className="rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-bold h-11 transition-all shadow-sm">
            <Link href="/dashboard/budgets/new">
              <FileText className="mr-2 h-4 w-4" />
              BUAT PENGAJUAN BARU
            </Link>
          </Button>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
        {statCards.map((card, index) => (
          <Card key={card.title} className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-none bg-white shadow-sm rounded-2xl">
            {/* Left Accent Strip */}
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ${card.gradient} to-transparent opacity-80`} />
            
            <CardHeader className="flex flex-row items-start justify-between space-y-0 p-5 pb-3">
              <CardTitle className="text-xs sm:text-[11px] uppercase font-bold tracking-widest text-muted-foreground whitespace-normal break-words max-w-[calc(100%-40px)] leading-tight">
                {card.title}
              </CardTitle>
              <div className={`rounded-xl p-2 ${card.bg} border transition-transform group-hover:scale-110 duration-300`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="font-heading text-2xl sm:text-3xl font-bold truncate tracking-tight text-gray-900">
                {card.isText ? card.value : card.value.toLocaleString('id-ID')}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1.5 font-medium line-clamp-1">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts & Table Row */}
      <div className="flex overflow-x-auto pb-6 pt-2 gap-6 -mx-4 px-4 snap-x snap-mandatory lg:grid lg:grid-cols-5 lg:overflow-visible lg:p-0 lg:mx-0 lg:flex-none hide-scrollbar">
        {/* Status Chart */}
        <div className="w-[85vw] max-w-sm shrink-0 snap-center lg:w-auto lg:max-w-none lg:col-span-2">
          <Card className="h-full relative overflow-hidden border-none shadow-sm rounded-2xl">
            <CardHeader className="p-5 sm:p-6 pb-2">
            <CardTitle className="font-heading text-lg font-bold">Status Pengajuan</CardTitle>
            <CardDescription className="text-xs font-medium">Distribusi status anggaran</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {statusData.length > 0 ? (
              <div className="space-y-6">
                <ChartContainer config={statusChartConfig} className="mx-auto aspect-square max-h-[220px]">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Pie
                      data={statusData}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={4}
                      stroke="transparent"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} className="hover:opacity-80 transition-opacity" />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center">
                  {statusData.map((d) => (
                    <div key={d.status} className="flex items-center gap-2 text-xs">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
                      <span className="text-muted-foreground font-medium">{d.status}</span>
                      <span className="font-bold text-gray-900">{d.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex h-[250px] items-center justify-center flex-col text-sm text-muted-foreground">
                 <PieChart className="w-12 h-12 text-gray-200 mb-2" />
                 <p className="font-medium">Belum ada statistik</p>
              </div>
            )}
          </CardContent>
          </Card>
        </div>

        {/* Recent Budgets Table */}
        <div className="w-[85vw] shrink-0 snap-center lg:w-auto lg:col-span-3">
          <Card className="h-full relative overflow-hidden border-none shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between p-5 sm:p-6 pb-4 border-b border-gray-50">
            <div>
              <CardTitle className="font-heading text-lg font-bold">Aktivitas Terbaru</CardTitle>
              <CardDescription className="text-xs font-medium mt-1">
                {isAdmin ? 'Pengajuan terbaru dari seluruh instansi' : 'Track record dokumen Anda'}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" className="hidden sm:inline-flex rounded-lg h-8 text-xs font-bold uppercase tracking-widest text-gray-500" asChild>
              <Link href={isAdmin ? '/dashboard/review' : '/dashboard/budgets'}>
                Semua
                <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {recentBudgets.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-gray-50 bg-gray-50/50">
                    <TableHead className="font-mono text-[10px] uppercase font-bold tracking-wider text-gray-500 pl-6 h-10">Dokumen</TableHead>
                    {isAdmin && <TableHead className="font-mono text-[10px] uppercase font-bold tracking-wider text-gray-500 h-10">Instansi</TableHead>}
                    <TableHead className="font-mono text-[10px] uppercase font-bold tracking-wider text-gray-500 text-right pr-6 h-10">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentBudgets.map((budget) => {
                    const config = statusConfig[budget.status as BudgetStatus]
                    return (
                      <TableRow key={budget.id} className="group hover:bg-gray-50/80 transition-colors border-gray-50">
                        <TableCell className="pl-6 py-4">
                          <Link
                            href={`/dashboard/${isAdmin ? 'review' : 'budgets'}/${budget.id}`}
                            className="font-bold text-sm text-gray-900 group-hover:text-sky-600 transition-colors"
                          >
                            {budget.title}
                          </Link>
                          <p className="text-[11px] font-mono text-muted-foreground mt-1 uppercase">
                            {formatDate(budget.updated_at)}
                          </p>
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-xs font-medium text-gray-600 py-4 max-w-[150px] truncate">
                            {(budget as any).institution?.name || '-'}
                          </TableCell>
                        )}
                        <TableCell className="text-right pr-6 py-4">
                           <div className="flex justify-end">
                             <Badge className={`${config.color} border-0 text-[10px] font-bold px-2.5 py-0.5 rounded-sm uppercase tracking-wider`}>
                               {config.label}
                             </Badge>
                           </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col h-[280px] items-center justify-center text-sm text-muted-foreground p-6">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <FileText className="h-8 w-8 text-gray-300" />
                </div>
                <p className="font-medium text-gray-900">Belum ada dokumen</p>
                <p className="text-xs mt-1">Daftar ini akan menampilkan pengajuan terbaru</p>
                {!isAdmin && (
                  <Button asChild className="mt-6 rounded-lg font-bold bg-gray-900 text-white h-10 px-6">
                    <Link href="/dashboard/budgets/new">Kirim Proposal Pertama</Link>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div>
        <Skeleton className="h-8 w-64 rounded-lg bg-gray-200" />
        <Skeleton className="h-4 w-72 mt-3 rounded-md bg-gray-100" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border-none shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5">
              <Skeleton className="h-3 w-24 rounded bg-gray-100" />
              <Skeleton className="h-8 w-8 rounded-xl bg-gray-100" />
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <Skeleton className="h-8 w-20 rounded-md bg-gray-200" />
              <Skeleton className="h-3 w-32 mt-3 rounded bg-gray-100" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2 border-none shadow-sm rounded-2xl">
          <CardHeader className="p-5"><Skeleton className="h-5 w-40 rounded bg-gray-200" /></CardHeader>
          <CardContent className="p-6"><Skeleton className="h-[220px] rounded-full mx-auto max-w-[220px] bg-gray-100" /></CardContent>
        </Card>
        <Card className="lg:col-span-3 border-none shadow-sm rounded-2xl">
          <CardHeader className="p-5"><Skeleton className="h-5 w-48 rounded bg-gray-200" /></CardHeader>
          <CardContent className="p-0">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="px-6 py-4 border-t border-gray-50 flex justify-between items-center">
                 <div>
                    <Skeleton className="h-4 w-48 mb-2 bg-gray-200 rounded" />
                    <Skeleton className="h-3 w-24 bg-gray-100 rounded" />
                 </div>
                 <Skeleton className="h-6 w-16 bg-gray-100 rounded-sm" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
