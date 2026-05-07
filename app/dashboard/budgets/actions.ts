'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * P0: Server-side budget creation with institution_id validation.
 * Ensures users can only create budgets for their own institution.
 */
export async function createBudgetAction(data: {
  title: string
  asDraft: boolean
}) {
  const supabase = await createClient()

  // 1. Authenticate
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Tidak terautentikasi. Silakan login ulang.' }
  }

  // 2. Fetch profile with institution
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, institution_id, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return { error: 'Profil tidak ditemukan.' }
  }

  if (!profile.institution_id) {
    return { error: 'Anda belum terdaftar di instansi manapun. Hubungi administrator.' }
  }

  // 3. Validate title
  if (!data.title.trim()) {
    return { error: 'Judul pengajuan wajib diisi.' }
  }

  // 4. Get active fiscal year
  const { data: fiscalYear, error: fyError } = await supabase
    .from('fiscal_years')
    .select('id')
    .eq('is_active', true)
    .single()

  if (fyError || !fiscalYear) {
    return { error: 'Tidak ada tahun anggaran aktif. Hubungi administrator.' }
  }

  // 5. Create budget with server-validated institution_id
  const { data: budget, error: budgetError } = await supabase
    .from('budgets')
    .insert({
      title: data.title.trim(),
      institution_id: profile.institution_id, // Server-validated!
      fiscal_year_id: fiscalYear.id,
      submitted_by: profile.id, // Server-validated!
      status: 'draft',
      submission_date: data.asDraft ? null : new Date().toISOString(),
      total_amount: 0,
    })
    .select('id')
    .single()

  if (budgetError) {
    return { error: `Gagal membuat pengajuan: ${budgetError.message}` }
  }

  return { success: true, budgetId: budget.id, institutionId: profile.institution_id, userId: profile.id }
}

/**
 * P0: Server-side budget submission with ownership validation.
 * Ensures only the owner can submit their draft budget.
 */
export async function submitBudgetAction(budgetId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tidak terautentikasi.' }

  // Verify ownership and status
  const { data: budget } = await supabase
    .from('budgets')
    .select('submitted_by, status, title, institution_id')
    .eq('id', budgetId)
    .single()

  if (!budget) return { error: 'Pengajuan tidak ditemukan.' }
  if (budget.submitted_by !== user.id) return { error: 'Anda bukan pemilik pengajuan ini.' }
  if (budget.status !== 'draft' && budget.status !== 'revision') {
    return { error: 'Hanya pengajuan berstatus draft atau revisi yang bisa diajukan.' }
  }

  // Check documents exist
  const { count } = await supabase
    .from('budget_documents')
    .select('id', { count: 'exact', head: true })
    .eq('budget_id', budgetId)

  if (!count || count === 0) {
    return { error: 'Minimal satu dokumen harus diunggah sebelum mengajukan.' }
  }

  // Reset all review statuses when re-submitting
  await supabase
    .from('budget_documents')
    .update({
      review_bapperida: null,
      review_setda: null,
      review_anggaran: null,
      review_aset: null,
    })
    .eq('budget_id', budgetId)

  // Update status
  const { error } = await supabase
    .from('budgets')
    .update({
      status: 'submitted',
      submission_date: new Date().toISOString(),
      review_date: null,
      reviewed_by: null,
    })
    .eq('id', budgetId)

  if (error) return { error: `Gagal mengajukan: ${error.message}` }

  // P1: Auto-notify all admins
  const { data: admins } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')

  if (admins && admins.length > 0) {
    const { data: institution } = await supabase
      .from('institutions')
      .select('name')
      .eq('id', budget.institution_id)
      .single()

    const notifications = admins.map(admin => ({
      user_id: admin.id,
      title: budget.status === 'revision' ? 'Pengajuan Revisi Dikirim Ulang' : 'Pengajuan Baru Masuk',
      message: `Pengajuan "${budget.title}" dari ${institution?.name || 'Instansi'} telah ${budget.status === 'revision' ? 'dikirim ulang setelah revisi' : 'diajukan'}.`,
      type: 'status_change' as const,
      related_budget_id: budgetId,
      is_read: false,
    }))

    await supabase.from('notifications').insert(notifications)
  }

  return { success: true }
}

/**
 * P1: Server-side re-submit after revision.
 * Resets review statuses and changes status back to submitted.
 */
export async function resubmitAfterRevisionAction(budgetId: string) {
  return submitBudgetAction(budgetId) // Same logic, already handles revision status
}
