'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/hooks/use-profile'
import { useDebounce } from '@/hooks/use-debounce'
import { formatDate } from '@/lib/format'
import { statusConfig, type Budget, type BudgetStatus } from '@/lib/types/database'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Archive, Search, Trash2, Eye, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'

export default function ManageBudgetsPage() {
  const { profile, isAdmin, isLoading: profileLoading } = useProfile()
  const { toast } = useToast()
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery) // P1: Debounced search
  const [budgetToDelete, setBudgetToDelete] = useState<Budget | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 15

  const fetchBudgets = useCallback(async (page: number) => {
    const supabase = createClient()
    setIsLoading(true)

    let query = supabase
      .from('budgets')
      .select('*, institution:institutions(name, code)', { count: 'exact' })

    // P1: Server-side filtering
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }
    if (debouncedSearch) {
      query = query.ilike('title', `%${debouncedSearch}%`)
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, count } = await query
      .order('updated_at', { ascending: false })
      .range(from, to)

    if (data) setBudgets(data as Budget[])
    setTotalCount(count || 0)
    setIsLoading(false)
  }, [statusFilter, debouncedSearch])

  useEffect(() => {
    if (!profileLoading && profile && isAdmin) {
      setCurrentPage(1)
      fetchBudgets(1)
    }
  }, [profileLoading, profile, isAdmin, statusFilter, debouncedSearch, fetchBudgets])

  useEffect(() => {
    if (!profileLoading && profile && isAdmin && currentPage > 1) {
      fetchBudgets(currentPage)
    }
  }, [currentPage])

  const totalPages = Math.ceil(totalCount / pageSize)

  async function handleDelete() {
    if (!budgetToDelete) return
    const supabase = createClient()
    setIsDeleting(true)
    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('id', budgetToDelete.id)

    setIsDeleting(false)
    setBudgetToDelete(null)

    if (error) {
      toast({
        title: 'Gagal menghapus',
        description: error.message,
        variant: 'destructive',
      })
    } else {
      setBudgets(prev => prev.filter(b => b.id !== budgetToDelete.id))
      setTotalCount(prev => prev - 1)
      toast({
        title: 'Pengajuan dihapus',
        description: `"${budgetToDelete.title}" berhasil dihapus dari sistem.`,
      })
    }
  }

  if (profileLoading) return <Skeleton className="h-96 w-full" />

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Archive className="h-12 w-12 text-muted-foreground/40 mb-3" />
        <h3 className="font-semibold text-lg">Akses Ditolak</h3>
        <p className="text-muted-foreground">Halaman ini hanya untuk Administrator</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kelola Pengajuan</h1>
          <p className="text-muted-foreground">Kelola seluruh pengajuan anggaran — hapus data yang tidak diperlukan lagi</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{totalCount}</span> pengajuan
        </div>
      </div>

      {/* Warning Banner */}
      <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <p>Penghapusan bersifat <strong>permanen</strong> dan tidak dapat dibatalkan. Pastikan Anda yakin sebelum menghapus pengajuan.</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari judul, instansi, atau pengaju..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Diajukan</SelectItem>
                <SelectItem value="under_review">Sedang Ditinjau</SelectItem>
                <SelectItem value="revision">Perlu Revisi</SelectItem>
                <SelectItem value="approved">Disetujui</SelectItem>
                <SelectItem value="rejected">Ditolak</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : budgets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Archive className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <h3 className="font-semibold text-lg">Tidak ada pengajuan</h3>
              <p className="text-sm text-muted-foreground">Coba ubah filter atau kata kunci pencarian</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Judul</TableHead>
                  <TableHead>Instansi</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Diperbarui</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {budgets.map((budget) => {
                  const config = statusConfig[budget.status as BudgetStatus]
                  return (
                    <TableRow key={budget.id} className="group">
                      <TableCell>
                        <Link
                          href={`/dashboard/review/${budget.id}`}
                          className="font-medium hover:underline underline-offset-4"
                        >
                          {budget.title}
                        </Link>
                        {budget.version > 1 && (
                          <span className="ml-1.5 text-xs text-muted-foreground">v{budget.version}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{(budget as any).institution?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge className={`${config.color} border-0 text-[11px]`}>{config.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(budget.updated_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <Link href={`/dashboard/review/${budget.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setBudgetToDelete(budget)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* P1: Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Menampilkan <span className="font-bold text-gray-900">{budgets.length}</span> dari <span className="font-bold text-gray-900">{totalCount}</span>
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1 || isLoading} className="h-8 text-xs font-bold">Sebelumnya</Button>
            <div className="flex items-center justify-center min-w-[2rem] h-8 text-xs font-bold bg-gray-50 rounded-md border border-gray-100">{currentPage} / {totalPages}</div>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage >= totalPages || isLoading} className="h-8 text-xs font-bold">Berikutnya</Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!budgetToDelete} onOpenChange={(open) => !open && setBudgetToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Pengajuan?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Anda akan menghapus pengajuan <strong>"{budgetToDelete?.title}"</strong> secara permanen.
                  Semua data terkait (item anggaran, dokumen, riwayat revisi) juga akan ikut terhapus.
                </p>
                <p className="text-destructive font-medium">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
