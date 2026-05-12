'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/hooks/use-profile'
import { formatDateTime, formatDate } from '@/lib/format'
import { statusConfig, type Budget, type Revision, type BudgetStatus } from '@/lib/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle, ArrowRightLeft, MessageSquare, FileText, Download, Clock, Shield, Lock, Trash2, Edit2, ClipboardCheck, Building2 } from 'lucide-react'
import Link from 'next/link'
import { submitReviewAction } from './actions'

type AdminReviewRole = 'review_bapperida' | 'review_setda' | 'review_anggaran' | 'review_aset'
type ReviewAction = 'approve' | 'revision' | 'reject'

interface AdminRoleDef {
  key: AdminReviewRole
  label: string
}

const ADMIN_ROLES: AdminRoleDef[] = [
  { key: 'review_bapperida', label: 'Bapperida' },
  { key: 'review_setda', label: 'Setda' },
  { key: 'review_anggaran', label: 'Bidang Anggaran BKAD' },
  { key: 'review_aset', label: 'Bidang Aset BKAD' },
]

export default function ReviewDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { profile, isAdmin } = useProfile()
  const budgetId = params.id as string

  const [budget, setBudget] = useState<any>(null)
  const [revisions, setRevisions] = useState<Revision[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const [activeRole, setActiveRole] = useState<AdminRoleDef | null>(null)
  const [reviewAction, setReviewAction] = useState<ReviewAction | null>(null)
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null)
  const [comments, setComments] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  
  const [editingReview, setEditingReview] = useState<any>(null)
  const [editComment, setEditComment] = useState('')
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null)

  useEffect(() => { fetchData() }, [budgetId])

  async function fetchData() {
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
        .select('*')
        .eq('budget_id', budgetId).order('created_at', { ascending: false }),
    ])

    if (budgetRes.data) setBudget(budgetRes.data)
    if (revisionsRes.data) setRevisions(revisionsRes.data as any)
    if (docsRes.data) setDocuments(docsRes.data)
    setIsLoading(false)
  }

  async function handleDownload(doc: any) {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.storage.from('budget_documents').createSignedUrl(doc.file_path, 3600)
      if (error) throw error
      if (data?.signedUrl) window.open(data.signedUrl, '_blank')
    } catch (error) {
      toast.error('Gagal membuka dokumen')
    }
  }

  async function handleReview() {
    if (!activeRole || !reviewAction || !profile || !activeDocumentId) return
    if (!comments.trim()) { toast.error('Komentar wajib diisi'); return }

    setIsProcessing(true)

    try {
      // P0: Use server action for server-side admin_role validation
      const result = await submitReviewAction({
        budgetId,
        documentId: activeDocumentId,
        reviewRoleKey: activeRole.key,
        action: reviewAction,
        comments,
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success(`Review ${result.roleName} berhasil disimpan`)
      setReviewAction(null)
      setActiveRole(null)
      setActiveDocumentId(null)
      setComments('')
      fetchData()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Gagal memproses review')
    } finally {
      setIsProcessing(false)
    }
  }

  async function handleDeleteConfirm() {
    if (!deletingReviewId) return
    setIsDeleting(deletingReviewId)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from('revisions').delete().eq('id', deletingReviewId).select()
      if (error) throw error
      if (!data || data.length === 0) {
         toast.error('Gagal menghapus: Akses ditolak oleh database (RLS)')
      } else {
         toast.success('Review berhasil dihapus')
         fetchData()
         setDeletingReviewId(null)
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Gagal menghapus review')
    } finally {
      setIsDeleting(null)
    }
  }

  async function handleUpdateReview() {
    if (!editingReview || !editComment.trim()) return
    setIsProcessing(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from('revisions').update({ comments: editComment }).eq('id', editingReview.id).select()
      if (error) throw error
      if (!data || data.length === 0) {
         toast.error('Gagal mengubah: Akses ditolak oleh database (RLS)')
      } else {
         toast.success('Review berhasil diperbarui')
         setEditingReview(null)
         fetchData()
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Gagal memperbarui review')
    } finally {
      setIsProcessing(false)
    }
  }

  // Explicit action: admin clicks "Mulai Review" to change status
  async function handleStartReview() {
    if (!budget || budget.status !== 'submitted' || !isAdmin || !profile) return
    const supabase = createClient()
    const { error } = await supabase
      .from('budgets')
      .update({ status: 'under_review', reviewed_by: profile.id })
      .eq('id', budgetId)
    if (!error) {
      setBudget((prev: any) => prev ? { ...prev, status: 'under_review' } : prev)
      toast.success('Status berhasil diubah ke "Sedang Ditinjau"')
    } else {
      toast.error('Gagal memulai review')
    }
  }

  if (isLoading) return <div className="space-y-6 w-full"><Skeleton className="h-8 w-64" /><Skeleton className="h-40 w-full" /></div>
  if (!budget) return <div className="flex flex-col items-center justify-center py-20"><p>Pengajuan tidak ditemukan</p></div>

  const config = statusConfig[budget.status as BudgetStatus]

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

  return (
    <div className="space-y-6 overflow-hidden w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between bg-card p-5 rounded-xl border border-border/60 shadow-sm w-full min-w-0">
        <div className="flex items-start gap-3 w-full min-w-0 flex-1">
          <Button variant="outline" size="icon" asChild className="mt-1 shrink-0 rounded-full h-10 w-10">
            <Link href="/dashboard/review"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground break-words leading-tight">{budget.title}</h1>
              <Badge className={`${config.color} border-0 px-3 py-1 text-xs rounded-full font-semibold uppercase tracking-wider shrink-0`}>{config.label}</Badge>
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1.5 shrink-0"><FileText className="h-4 w-4 shrink-0" /> <span className="truncate">{documents.length} Dokumen Terlampir</span></span>
              <span className="flex items-center gap-1.5 shrink-0"><Clock className="h-4 w-4 shrink-0" /> <span className="truncate">Diajukan tgl {formatDate(budget.submission_date || budget.created_at)}</span></span>
              <span className="flex items-center gap-1.5 font-medium text-foreground shrink-0"><CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> <span className="truncate">Pengajuan Valid</span></span>
            </div>
          </div>
        </div>
        {/* Explicit "Start Review" button for submitted budgets */}
        {isAdmin && budget.status === 'submitted' && (
          <Button onClick={handleStartReview} className="bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-full px-6 shrink-0">
            <ClipboardCheck className="mr-2 h-4 w-4" /> Mulai Review
          </Button>
        )}
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
              {isAdmin && (
                <div className="p-0 grid grid-cols-2 lg:grid-cols-4 divide-y divide-x lg:divide-y-0 border-b border-border/50 bg-card/50 w-full max-w-full min-w-0">
                  {ADMIN_ROLES.map((role) => {
                    const statusStr = doc[role.key] || 'pending'
                    const labelStr = statusLabels[statusStr] || 'Menunggu'
                    const isAuthorized = profile?.admin_role === 'superadmin' || profile?.admin_role === role.key.replace('review_', '')
                    
                    return (
                      <div key={role.key} className={`p-4 flex flex-col justify-between gap-3 min-w-0 ${!isAuthorized ? 'opacity-70 bg-muted/10' : 'hover:bg-muted/30 transition-colors'}`}>
                        <div className="flex flex-col gap-2 min-w-0">
                          <div className="flex items-center justify-between min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <p className="font-bold text-xs text-foreground/80 uppercase tracking-wider break-words whitespace-normal leading-tight">{role.label}</p>
                              {!isAuthorized && <Shield className="h-3 w-3 shrink-0 text-muted-foreground" aria-label="Tidak ada hak akses" />}
                            </div>
                          </div>
                          <div>
                            <Badge className={`${statusBadgeColor(statusStr)} border-0 shadow-none text-xs px-2.5 py-0.5 rounded-full shrink-0`}>{labelStr}</Badge>
                          </div>
                        </div>
                        
                        {isAuthorized && (
                          <div className="grid grid-cols-3 gap-2 mt-2">
                            <Button size="icon" variant="outline" className="h-8 w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800" title="Setujui" onClick={() => { setActiveRole(role); setActiveDocumentId(doc.id); setReviewAction('approve') }}>
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="outline" className="h-8 w-full border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800" title="Minta Revisi" onClick={() => { setActiveRole(role); setActiveDocumentId(doc.id); setReviewAction('revision') }}>
                              <AlertCircle className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="outline" className="h-8 w-full border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800" title="Tolak" onClick={() => { setActiveRole(role); setActiveDocumentId(doc.id); setReviewAction('reject') }}>
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        {!isAuthorized && (
                          <div className="text-[10.5px] text-muted-foreground mt-2 italic leading-relaxed bg-muted/30 p-2 rounded-md">
                            Tidak memiliki akses untuk bidang ini.
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
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
                          {(profile?.id === rev.reviewer_id || isAdmin) && (
                            <div className="flex items-center gap-1 sm:self-start shrink-0">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500 hover:text-sky-600 hover:bg-sky-50" onClick={() => { setEditingReview(rev); setEditComment(rev.comments || '') }}>
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-50" disabled={isDeleting === rev.id} onClick={() => setDeletingReviewId(rev.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          )}
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

          {/* Edit Dialog */}
          {editingReview && (
            <Dialog open={!!editingReview} onOpenChange={() => { setEditingReview(null); setEditComment('') }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Review</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label>Komentar</Label>
                    <Textarea value={editComment} onChange={(e) => setEditComment(e.target.value)} rows={5} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditingReview(null)}>Batal</Button>
                  <Button onClick={handleUpdateReview} disabled={isProcessing} className="bg-sky-600 hover:bg-sky-700 text-white">
                    {isProcessing && <Spinner className="mr-2 h-4 w-4" />}
                    Simpan Perubahan
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {/* Delete Dialog */}
          {deletingReviewId && (
            <Dialog open={!!deletingReviewId} onOpenChange={() => setDeletingReviewId(null)}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-red-600 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" /> Konfirmasi Hapus
                  </DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <p className="text-gray-700 text-sm">
                    Apakah Anda yakin ingin menghapus catatan review ini secara permanen? Aksi ini tidak dapat dibatalkan.
                  </p>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="outline" onClick={() => setDeletingReviewId(null)}>Batal</Button>
                  <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting !== null}>
                    {isDeleting ? <Spinner className="mr-2 h-4 w-4" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    Ya, Hapus Review
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {activeRole && reviewAction && activeDocumentId && (
        <Dialog open={!!reviewAction} onOpenChange={() => { setReviewAction(null); setActiveRole(null); setActiveDocumentId(null); setComments('') }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {reviewAction === 'approve' ? 'Setujui Dokumen?' : reviewAction === 'revision' ? 'Minta Revisi?' : 'Tolak Dokumen?'}
              </DialogTitle>
              <DialogDescription>
                Anda akan melakukan review mewakili <strong>{activeRole.label}</strong>.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Komentar dan Catatan *</Label>
                <Textarea value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Berikan catatan, saran, atau alasan penolakan/revisi..." rows={4} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReviewAction(null)}>Batal</Button>
              <Button onClick={handleReview} disabled={isProcessing} className={
                reviewAction === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                reviewAction === 'revision' ? 'bg-orange-600 hover:bg-orange-700' :
                'bg-red-600 hover:bg-red-700'
              }>
                {isProcessing ? <Spinner className="mr-2 h-4 w-4" /> : null}
                Konfirmasi {reviewAction === 'approve' ? 'Setuju' : reviewAction === 'revision' ? 'Revisi' : 'Tolak'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
