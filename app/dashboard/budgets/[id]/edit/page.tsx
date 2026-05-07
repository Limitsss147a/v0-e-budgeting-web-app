'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/hooks/use-profile'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'
import { ArrowLeft, Save, FileText, UploadCloud, Download, X, Building2 } from 'lucide-react'
import Link from 'next/link'
import { submitBudgetAction } from '../../actions'

export default function EditBudgetPage() {
  const params = useParams()
  const router = useRouter()
  const { profile, isLoading: profileLoading } = useProfile()
  const budgetId = params.id as string

  const [budget, setBudget] = useState<any>(null)
  const [title, setTitle] = useState('')
  const [existingDocs, setExistingDocs] = useState<any[]>([])
  const [notaDinasFiles, setNotaDinasFiles] = useState<File[]>([])
  const [rkaDpaFiles, setRkaDpaFiles] = useState<File[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => { fetchBudget() }, [budgetId])

  async function fetchBudget() {
    setIsLoading(true)
    const supabase = createClient()
    const [budgetRes, docsRes] = await Promise.all([
      supabase.from('budgets').select('*, institution:institutions(name)').eq('id', budgetId).single(),
      supabase.from('budget_documents').select('*').eq('budget_id', budgetId).order('created_at', { ascending: false }),
    ])
    if (budgetRes.error || !budgetRes.data) {
      toast.error('Pengajuan tidak ditemukan')
      router.push('/dashboard/budgets')
      return
    }
    setBudget(budgetRes.data)
    setTitle(budgetRes.data.title)
    if (docsRes.data) setExistingDocs(docsRes.data)
    setIsLoading(false)
  }

  async function handleSubmit(asDraft: boolean) {
    if (!title.trim()) { toast.error('Judul pengajuan wajib diisi'); return }
    setIsSaving(true)
    const supabase = createClient()

    try {
      // Update title
      const { error: titleError } = await supabase.from('budgets').update({ 
        title, 
        updated_at: new Date().toISOString() 
      }).eq('id', budgetId)
      if (titleError) throw titleError

      const docsToUpload = []
      
      for (const file of notaDinasFiles) {
        const ext = file.name.split('.').pop()
        const fileName = `${budgetId}/nota_dinas_${Math.random().toString(36).substring(2, 9)}.${ext}`
        const { error: uploadError } = await supabase.storage.from('budget_documents').upload(fileName, file)
        if (!uploadError) {
          docsToUpload.push({ budget_id: budgetId, file_name: file.name, file_path: fileName, file_type: file.type || 'application/pdf', file_size: file.size, document_type: 'nota_dinas', uploaded_by: profile!.id })
        }
      }

      for (const file of rkaDpaFiles) {
        const ext = file.name.split('.').pop()
        const fileName = `${budgetId}/rka_dpa_${Math.random().toString(36).substring(2, 9)}.${ext}`
        const { error: uploadError } = await supabase.storage.from('budget_documents').upload(fileName, file)
        if (!uploadError) {
          docsToUpload.push({ budget_id: budgetId, file_name: file.name, file_path: fileName, file_type: file.type || 'application/pdf', file_size: file.size, document_type: 'rka_dpa', uploaded_by: profile!.id })
        }
      }

      if (docsToUpload.length > 0) {
        await supabase.from('budget_documents').insert(docsToUpload)
      }

      if (!asDraft) {
        // P1: Use server action for re-submission with review status reset
        const result = await submitBudgetAction(budgetId)
        if (result.error) {
          toast.error(result.error)
          setIsSaving(false)
          return
        }
        toast.success('Pengajuan berhasil diperbarui dan diajukan ulang')
      } else {
        toast.success('Pengajuan berhasil diperbarui (draft)')
      }
      
      router.push(`/dashboard/budgets/${budgetId}`)
    } catch (error: any) {
      toast.error(`Gagal menyimpan: ${error?.message || 'Terjadi kesalahan'}`)
    } finally {
      setIsSaving(false)
    }
  }

  if (profileLoading || isLoading) return <div className="flex h-64 items-center justify-center"><Spinner className="h-8 w-8" /></div>
  if (budget?.status !== 'draft' && budget?.status !== 'revision') {
    return <div className="flex flex-col items-center justify-center py-20"><p>Pengajuan ini tidak dapat diedit karena sedang diproses atau sudah disetujui.</p></div>
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild><Link href={`/dashboard/budgets/${budgetId}`}><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Pengajuan RKA/DPA</h1>
          <p className="text-muted-foreground">Perbarui informasi dan dokumen pengajuan</p>
        </div>
      </div>

      <Card className="border-0 shadow-md rounded-xl overflow-hidden">
        <CardHeader className="bg-sky-500/5 border-b border-sky-100 pb-4">
          <CardTitle className="text-lg font-bold text-sky-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-sky-500" /> SKPD Pengusul
          </CardTitle>
          <CardDescription>Informasi Instansi yang mengajukan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label>Nama Instansi / SKPD</Label>
            <Input value={budget.institution?.name || ''} disabled className="bg-muted text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Judul Pengajuan *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md rounded-xl overflow-hidden">
        <CardHeader className="bg-sky-500/5 border-b border-sky-100 pb-4">
          <CardTitle className="text-lg font-bold text-sky-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-500" /> Perbarui Dokumen (Opsional)
          </CardTitle>
          <CardDescription>Unggah file baru jika perlu mengganti dokumen sebelumnya.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>1. Nota Dinas</Label>
              <div className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center bg-muted/20 text-center transition-colors min-h-[160px]">
                {notaDinasFiles.length > 0 ? (
                  <div className="w-full space-y-2 mb-4">
                    {notaDinasFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-background border rounded p-2 text-left">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 shrink-0 text-primary" />
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate w-[150px] sm:w-[200px]">{file.name}</p>
                            <p className="text-[10px] text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setNotaDinasFiles(prev => prev.filter((_, i) => i !== idx))} disabled={isSaving}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-xs text-muted-foreground px-4">Biarkan kosong jika tidak ada tambahan dokumen Nota Dinas baru</p>
                  </>
                )}
                <div className="mt-auto pt-2">
                  <Label htmlFor="nota_dinas_upload" className="cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-md text-xs font-medium h-8 px-3 mb-0">
                    <UploadCloud className="mr-2 h-3 w-3" />
                    Tambah File Baru
                  </Label>
                  <Input id="nota_dinas_upload" type="file" multiple className="hidden" onChange={(e) => {
                    const newFiles = Array.from(e.target.files || [])
                    setNotaDinasFiles(prev => [...prev, ...newFiles])
                    e.target.value = ''
                  }} disabled={isSaving} />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>2. RKA/DPA</Label>
              <div className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center bg-muted/20 text-center transition-colors min-h-[160px]">
                {rkaDpaFiles.length > 0 ? (
                  <div className="w-full space-y-2 mb-4">
                    {rkaDpaFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-background border rounded p-2 text-left">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 shrink-0 text-emerald-600" />
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate w-[150px] sm:w-[200px]">{file.name}</p>
                            <p className="text-[10px] text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setRkaDpaFiles(prev => prev.filter((_, i) => i !== idx))} disabled={isSaving}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-xs text-muted-foreground px-4">Biarkan kosong jika tidak ada tambahan dokumen RKA/DPA baru</p>
                  </>
                )}
                <div className="mt-auto pt-2">
                  <Label htmlFor="rka_dpa_upload" className="cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700 inline-flex items-center justify-center rounded-md text-xs font-medium h-8 px-3 mb-0">
                    <UploadCloud className="mr-2 h-3 w-3" />
                    Tambah File Baru
                  </Label>
                  <Input id="rka_dpa_upload" type="file" multiple className="hidden" onChange={(e) => {
                    const newFiles = Array.from(e.target.files || [])
                    setRkaDpaFiles(prev => [...prev, ...newFiles])
                    e.target.value = ''
                  }} disabled={isSaving} />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={() => handleSubmit(true)} disabled={isSaving} className="sm:w-auto">
          {isSaving ? <Spinner className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
          Simpan Draft
        </Button>
        {budget?.status === 'revision' && (
          <Button onClick={() => handleSubmit(false)} disabled={isSaving} className="sm:w-auto bg-sky-600 hover:bg-sky-700 text-white font-bold">
            {isSaving ? <Spinner className="mr-2 h-4 w-4" /> : <UploadCloud className="mr-2 h-4 w-4" />}
            Ajukan Ulang Setelah Revisi
          </Button>
        )}
      </div>
    </div>
  )
}
