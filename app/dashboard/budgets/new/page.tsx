'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/hooks/use-profile'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'
import { ArrowLeft, Save, Send, FileText, UploadCloud, X, Building2 } from 'lucide-react'
import Link from 'next/link'
import { createBudgetAction, submitBudgetAction } from '../actions'

// ---------- File Upload Validation ----------
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx']
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]
const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25 MB
const MAX_FILE_SIZE_LABEL = '25 MB'

function validateFile(file: File): string | null {
  const ext = '.' + (file.name.split('.').pop()?.toLowerCase() || '')
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return `File "${file.name}" tidak diizinkan. Format yang diterima: ${ALLOWED_EXTENSIONS.join(', ')}`
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type) && file.type !== 'application/octet-stream') {
    return `Format file "${file.name}" tidak dikenali. Gunakan PDF, DOC, DOCX, XLS, atau XLSX.`
  }
  if (file.size > MAX_FILE_SIZE) {
    return `File "${file.name}" melebihi batas ${MAX_FILE_SIZE_LABEL}. Ukuran file: ${(file.size / 1024 / 1024).toFixed(1)} MB`
  }
  return null
}

function validateFiles(files: File[]): { valid: File[]; errors: string[] } {
  const valid: File[] = []
  const errors: string[] = []
  for (const file of files) {
    const err = validateFile(file)
    if (err) errors.push(err)
    else valid.push(file)
  }
  return { valid, errors }
}
// ---------- End Validation ----------

export default function NewBudgetPage() {
  const router = useRouter()
  const { profile, isLoading: profileLoading } = useProfile()
  const [title, setTitle] = useState('')
  const [notaDinasFiles, setNotaDinasFiles] = useState<File[]>([])
  const [rkaDpaFiles, setRkaDpaFiles] = useState<File[]>([])
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit(asDraft: boolean) {
    if (!title.trim()) {
      toast.error('Judul pengajuan wajib diisi')
      return
    }


    if (rkaDpaFiles.length === 0) {
      toast.error('Minimal satu file RKA/DPA wajib diunggah')
      return
    }

    setIsSaving(true)

    try {
      // P0: Use server action for creation with validated institution_id
      const result = await createBudgetAction({ title, asDraft })
      if (result.error) {
        toast.error(result.error)
        return
      }

      const budgetId = result.budgetId!
      const userId = result.userId!
      const supabase = createClient()

      // Upload files (still client-side for binary data)
      const docsToUpload = []
      
      for (const notaFile of notaDinasFiles) {
        const ext = notaFile.name.split('.').pop()
        const fileName = `${budgetId}/nota_dinas_${Math.random().toString(36).substring(2, 9)}.${ext}`
        const { error: uploadError } = await supabase.storage.from('budget_documents').upload(fileName, notaFile)
        if (uploadError) {
          console.error('Nota Dinas upload error:', uploadError)
          toast.error(`Gagal mengunggah file ${notaFile.name}: ` + uploadError.message)
        } else {
          docsToUpload.push({
            budget_id: budgetId,
            file_name: notaFile.name,
            file_path: fileName,
            file_type: notaFile.type || 'application/octet-stream',
            file_size: notaFile.size,
            document_type: 'nota_dinas',
            uploaded_by: userId
          })
        }
      }

      for (const rkaFile of rkaDpaFiles) {
        const ext = rkaFile.name.split('.').pop()
        const fileName = `${budgetId}/rka_dpa_${Math.random().toString(36).substring(2, 9)}.${ext}`
        const { error: uploadError } = await supabase.storage.from('budget_documents').upload(fileName, rkaFile)
        if (uploadError) {
          console.error('RKA/DPA upload error:', uploadError)
          toast.error(`Gagal mengunggah file ${rkaFile.name}: ` + uploadError.message)
        } else {
          docsToUpload.push({
            budget_id: budgetId,
            file_name: rkaFile.name,
            file_path: fileName,
            file_type: rkaFile.type || 'application/octet-stream',
            file_size: rkaFile.size,
            document_type: 'rka_dpa',
            uploaded_by: userId
          })
        }
      }

      if (docsToUpload.length > 0) {
        const { error: docsInsertError } = await supabase.from('budget_documents').insert(docsToUpload)
        if (docsInsertError) {
          console.error('Documents insert error:', docsInsertError)
        }
      }

      if (!asDraft) {
        // P0: Use server action to submit with ownership validation
        const submitResult = await submitBudgetAction(budgetId)
        if (submitResult.error) {
          toast.error(submitResult.error)
          return
        }
      }

      toast.success(asDraft ? 'Pengajuan berhasil disimpan sebagai draft' : 'Pengajuan RKA/DPA berhasil diajukan')
      router.push('/dashboard/budgets')
    } catch (error: any) {
      console.error('Error saving budget:', error?.message || error)
      toast.error(`Gagal menyimpan: ${error?.message || 'Terjadi kesalahan sistem'}`)
    } finally {
      setIsSaving(false)
    }
  }

  if (profileLoading) return <div className="flex h-64 items-center justify-center"><Spinner className="h-8 w-8" /></div>

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/budgets"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Buat Pengajuan RKA/DPA Baru</h1>
          <p className="text-muted-foreground">Silakan melengkapi dokumen pengajuan RKA/DPA</p>
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
            <Input value={profile?.institution?.name || ''} disabled className="bg-muted text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Judul Pengajuan *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Pengajuan RKA-DPA TA 2026"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md rounded-xl overflow-hidden">
        <CardHeader className="bg-sky-500/5 border-b border-sky-100 pb-4">
          <CardTitle className="text-lg font-bold text-sky-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-500" /> Dokumen Pendukung
          </CardTitle>
          <CardDescription>Unggah file Nota Dinas dan RKA/DPA yang bersangkutan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>1. Nota Dinas (Opsional)</Label>
              <div className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center bg-muted/20 text-center hover:bg-muted/40 transition-colors min-h-[160px]">
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
                    <p className="text-xs text-muted-foreground">Pilih satu atau lebih dokumen</p>
                  </>
                )}
                <div className="mt-auto pt-2">
                  <Label htmlFor="nota_dinas_upload" className="cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-md text-xs font-medium h-8 px-3 mb-0">
                    <UploadCloud className="mr-2 h-3 w-3" />
                    Tambah File
                  </Label>
                  <Input id="nota_dinas_upload" type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx" className="hidden" onChange={(e) => {
                    const { valid, errors } = validateFiles(Array.from(e.target.files || []))
                    errors.forEach(err => toast.error(err))
                    if (valid.length > 0) setNotaDinasFiles(prev => [...prev, ...valid])
                    e.target.value = ''
                  }} disabled={isSaving} />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>2. RKA/DPA *</Label>
              <div className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center bg-muted/20 text-center hover:bg-muted/40 transition-colors min-h-[160px]">
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
                    <p className="text-xs text-muted-foreground">Pilih satu atau lebih dokumen</p>
                  </>
                )}
                <div className="mt-auto pt-2">
                  <Label htmlFor="rka_dpa_upload" className="cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700 inline-flex items-center justify-center rounded-md text-xs font-medium h-8 px-3 mb-0">
                    <UploadCloud className="mr-2 h-3 w-3" />
                    Tambah File
                  </Label>
                  <Input id="rka_dpa_upload" type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx" className="hidden" onChange={(e) => {
                    const { valid, errors } = validateFiles(Array.from(e.target.files || []))
                    errors.forEach(err => toast.error(err))
                    if (valid.length > 0) setRkaDpaFiles(prev => [...prev, ...valid])
                    e.target.value = ''
                  }} disabled={isSaving} />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={() => handleSubmit(true)} disabled={isSaving}>
          {isSaving ? <Spinner className="mr-2" /> : <Save className="mr-2 h-4 w-4" />}
          Simpan Draft
        </Button>
        <Button onClick={() => handleSubmit(false)} disabled={isSaving}>
          {isSaving ? <Spinner className="mr-2" /> : <Send className="mr-2 h-4 w-4" />}
          Ajukan Sekarang
        </Button>
      </div>
    </div>
  )
}
