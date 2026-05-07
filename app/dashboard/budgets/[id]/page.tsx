'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/hooks/use-profile'
import { formatDateTime } from '@/lib/format'
import { statusConfig, type Budget, type BudgetDocument, type Revision, type BudgetStatus } from '@/lib/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import {
  ArrowLeft, Edit, Send, Trash2, FileText, Download, Clock, CheckCircle2, XCircle, AlertCircle, ArrowRightLeft, MessageSquare, Printer, Building2
} from 'lucide-react'
import Link from 'next/link'
import { submitBudgetAction } from '../actions'

export default function BudgetDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { profile, isAdmin } = useProfile()
  const [budget, setBudget] = useState<any>(null)
  const [revisions, setRevisions] = useState<Revision[]>([])
  const [documents, setDocuments] = useState<BudgetDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const budgetId = params.id as string

  useEffect(() => { fetchBudgetDetail() }, [budgetId])

  async function fetchBudgetDetail() {
    const supabase = createClient()
    setIsLoading(true)

    const [budgetRes, revisionsRes, docsRes] = await Promise.all([
      supabase.from('budgets')
        .select('*, institution:institutions(name, code)')
        .eq('id', budgetId).single(),
      supabase.from('revisions')
        .select('*, reviewer:profiles!revisions_reviewer_id_fkey(institution:institutions(name), admin_role)')
        .eq('budget_id', budgetId).order('created_at', { ascending: false }),
      supabase.from('budget_documents')
        .select('*').eq('budget_id', budgetId).order('created_at', { ascending: false }),
    ])

    if (budgetRes.data) setBudget(budgetRes.data)
    if (revisionsRes.data) setRevisions(revisionsRes.data as unknown as Revision[])
    if (docsRes.data) setDocuments(docsRes.data)

    setIsLoading(false)
  }

  async function handleSubmit() {
    setIsSubmitting(true)
    try {
      // P0: Use server action for ownership validation
      const result = await submitBudgetAction(budgetId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(budget?.status === 'revision' ? 'RKA/DPA berhasil diajukan ulang setelah revisi' : 'RKA/DPA berhasil diajukan')
        fetchBudgetDetail()
      }
    } catch {
      toast.error('Gagal mengajukan RKA/DPA')
    }
    setIsSubmitting(false)
  }

  async function handleDownload(doc: BudgetDocument) {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.storage.from('budget_documents').createSignedUrl(doc.file_path, 3600)
      if (error) throw error
      if (data?.signedUrl) window.open(data.signedUrl, '_blank')
    } catch (error) {
      toast.error('Gagal mengunduh dokumen')
    }
  }

  async function handleDelete() {
    const supabase = createClient()
    const { error } = await supabase.from('budgets').delete().eq('id', budgetId)
    if (error) {
      toast.error('Gagal menghapus pengajuan')
    } else {
      toast.success('Pengajuan berhasil dihapus')
      router.push('/dashboard/budgets')
    }
  }

  if (isLoading) return <div className="space-y-6 max-w-4xl"><Skeleton className="h-8 w-64" /><Card><CardContent className="p-6"><Skeleton className="h-40 w-full" /></CardContent></Card></div>
  if (!budget) return <div className="flex flex-col items-center justify-center py-20"><p>Pengajuan tidak ditemukan</p></div>

  const config = statusConfig[budget.status as BudgetStatus]
  const canSubmit = !isAdmin && (budget.status === 'draft' || budget.status === 'revision')
  const canEdit = !isAdmin && (budget.status === 'draft' || budget.status === 'revision')
  const canDelete = !isAdmin && budget.status === 'draft'

  const statusBadgeColor = (status: string) => {
    switch(status) {
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'revision': return 'bg-orange-100 text-orange-800'
      default: return 'bg-yellow-100 text-yellow-800'
    }
  }

  const statusLabels: Record<string, string> = {
    pending: 'Menunggu',
    approved: 'Disetujui',
    rejected: 'Ditolak',
    revision: 'Perlu Revisi',
  }

  const ADMIN_ROLES = [
    { key: 'review_bapperida', label: 'Bapperida' },
    { key: 'review_setda', label: 'Setda' },
    { key: 'review_anggaran', label: 'Bidang Anggaran BKAD' },
    { key: 'review_aset', label: 'Bidang Aset BKAD' },
  ]

  const revisionStatusIcon = (status: BudgetStatus) => {
    switch (status) {
      case 'approved': return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'rejected': return <XCircle className="h-4 w-4 text-red-600" />
      case 'revision': return <AlertCircle className="h-4 w-4 text-orange-600" />
      case 'under_review': return <Clock className="h-4 w-4 text-yellow-600" />
      case 'submitted': return <Send className="h-4 w-4 text-blue-600" />
      default: return <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
    }
  }

  return (
    <div className="space-y-6 max-w-4xl overflow-hidden w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between w-full min-w-0">
        <div className="flex items-start gap-3 w-full min-w-0 flex-1">
          <Button variant="ghost" size="icon" asChild className="mt-1 shrink-0">
            <Link href="/dashboard/budgets"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight break-words leading-tight">{budget.title}</h1>
              <Badge className={`${config.color} border-0 shrink-0`}>{config.label}</Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2 sm:ml-auto">
          {canEdit && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/budgets/${budgetId}/edit`}>
                <Edit className="mr-1 h-3 w-3" />
                {budget.status === 'revision' ? 'Edit & Revisi' : 'Edit'}
              </Link>
            </Button>
          )}
          {canSubmit && (
            <Button size="sm" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? <Spinner className="mr-1" /> : <Send className="mr-1 h-3 w-3" />}
              {budget.status === 'revision' ? 'Ajukan Ulang' : 'Ajukan'}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
            <Printer className="mr-1 h-3 w-3" /> Cetak Laporan
          </Button>
          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="mr-1 h-3 w-3" /> Hapus
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Hapus Pengajuan?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Pengajuan &quot;{budget.title}&quot; akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Hapus
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <Card className="border-0 shadow-md rounded-xl overflow-hidden w-full max-w-full">
        <CardHeader className="bg-sky-500/5 border-b border-sky-100 pb-4 min-w-0">
          <CardTitle className="text-lg font-bold text-sky-900 flex items-center gap-2 min-w-0 break-words">
            <Building2 className="w-5 h-5 text-sky-500 shrink-0" /> <span className="truncate">SKPD Pengusul</span>
          </CardTitle>
          <CardDescription className="truncate">Informasi Instansi yang mengajukan</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <p className="font-semibold text-lg text-primary">{budget.institution?.name || '-'}</p>
            <p className="text-sm text-muted-foreground mt-1">Kode: {budget.institution?.code || '-'}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6 w-full max-w-full min-w-0">
        <div className="space-y-6 md:col-span-2 w-full max-w-full min-w-0">
          {documents.length > 0 ? documents.map((doc, index) => (
            <Card key={doc.id || index} className="border-0 shadow-md rounded-xl overflow-hidden bg-card w-full max-w-full min-w-0">
              <div className="p-4 border-b border-sky-100 bg-sky-500/5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between min-w-0 w-full">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <FileText className={`h-8 w-8 shrink-0 ${doc.document_type === 'rka_dpa' ? 'text-emerald-500' : 'text-blue-500'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{doc.file_name}</p>
                    <p className="text-xs text-muted-foreground uppercase truncate">{doc.document_type.replace('_', ' ')} • {(doc.file_size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <Button variant="secondary" size="sm" onClick={() => handleDownload(doc)} className="shrink-0 bg-secondary hover:bg-secondary/80">
                  <Download className="mr-2 w-4 h-4 shrink-0" /> Buka Dokumen
                </Button>
              </div>
              <div className="p-0 grid grid-cols-2 lg:grid-cols-4 divide-y divide-x lg:divide-y-0 border-b border-border/50 bg-card/50 w-full max-w-full min-w-0">
                {ADMIN_ROLES.map((role) => {
                  const statusStr = (doc as any)[role.key] || 'pending'
                  const labelStr = statusLabels[statusStr as string] || 'Menunggu'
                  
                  return (
                    <div key={role.key} className="p-4 flex flex-col justify-between gap-3 min-w-0">
                      <div className="flex flex-col gap-2 min-w-0">
                        <div className="flex items-center justify-between min-w-0">
                          <p className="font-bold text-xs text-foreground/80 uppercase tracking-wider break-words whitespace-normal leading-tight">{role.label}</p>
                        </div>
                        <div>
                          <Badge className={`${statusBadgeColor(statusStr)} border-0 shadow-none text-xs px-2.5 py-0.5 rounded-full shrink-0`}>{labelStr}</Badge>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )) : (
            <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground italic text-center">Tidak ada dokumen terlampir.</p></CardContent></Card>
          )}

          {revisions.length > 0 && (
            <Card className="mt-6 border-0 shadow-md rounded-xl overflow-hidden w-full max-w-full">
              <CardHeader className="bg-sky-500/5 border-b border-sky-100 pb-4 min-w-0">
                <CardTitle className="text-lg font-bold text-sky-900 flex items-center gap-2 min-w-0 break-words">
                  <MessageSquare className="w-5 h-5 text-sky-500 shrink-0" /> <span className="truncate">Riwayat Review Dokumen</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-2 relative">
                  {revisions.map((rev, index) => (
                    <div key={rev.id} className="relative flex gap-4 w-full min-w-0">
                      {index < revisions.length - 1 && <div className="absolute left-[15px] top-10 bottom-[-24px] w-0.5 bg-gray-200 rounded-full" />}
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 border-[3px] border-white shadow-sm mt-1 z-10 content-start">
                        <MessageSquare className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-4 hover:shadow-md transition-shadow">
                        <div className="py-2.5 px-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between bg-gray-50/80 gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-gray-800 break-words leading-tight">{(rev as any).reviewer?.institution?.name || (rev as any).reviewer?.admin_role || 'System'}</p>
                            <p className="text-[11px] text-gray-500 font-medium tracking-wide flex items-center gap-1.5 mt-0.5">
                              <Clock className="w-3 h-3 shrink-0" /> <span className="truncate">{formatDateTime(rev.created_at)}</span>
                            </p>
                          </div>
                        </div>
                        {rev.comments && (
                          <div className="p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
                            {rev.comments}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          nav, aside, .print\\:hidden, button, [role="alertdialog"] {
            display: none !important;
          }
          body {
            background-color: white !important;
            color: black !important;
          }
          .max-w-4xl {
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .Card {
            border: 1px solid #eee !important;
            box-shadow: none !important;
          }
          .Badge {
            border: 1px solid #ccc !important;
            background: transparent !important;
            color: black !important;
          }
        }
      `}</style>
    </div>
  )
}
