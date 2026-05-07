'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * P0: Server-side admin_role authorization for document review.
 * Validates that the admin has the correct admin_role before updating
 * the review column on budget_documents.
 */

const ROLE_COLUMN_MAP: Record<string, string> = {
  bapperida: 'review_bapperida',
  setda: 'review_setda',
  anggaran: 'review_anggaran',
  aset: 'review_aset',
}

export async function submitReviewAction(data: {
  budgetId: string
  documentId: string
  reviewRoleKey: string // e.g. 'review_bapperida'
  action: 'approve' | 'revision' | 'reject'
  comments: string
}) {
  const supabase = await createClient()

  // 1. Authenticate
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Tidak terautentikasi. Silakan login ulang.' }
  }

  // 2. Fetch profile & verify admin role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, admin_role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || profile.role !== 'admin') {
    return { error: 'Akses ditolak. Anda bukan administrator.' }
  }

  // 3. Validate admin_role against the review column
  const requiredRole = data.reviewRoleKey.replace('review_', '')
  const validRoles = Object.keys(ROLE_COLUMN_MAP)
  
  if (!validRoles.includes(requiredRole)) {
    return { error: 'Bidang review tidak valid.' }
  }

  if (profile.admin_role !== 'superadmin' && profile.admin_role !== requiredRole) {
    return { error: `Anda tidak memiliki akses untuk bidang ${requiredRole}. Admin role Anda: ${profile.admin_role}` }
  }

  // 4. Validate the review column name is legitimate
  const columnName = ROLE_COLUMN_MAP[requiredRole]
  if (!columnName) {
    return { error: 'Kolom review tidak valid.' }
  }

  // 5. Validate comments
  if (!data.comments.trim()) {
    return { error: 'Komentar wajib diisi.' }
  }

  // 6. Perform the update
  const roleStatus = data.action === 'approve' ? 'approved' : data.action === 'revision' ? 'revision' : 'rejected'

  const { error: docError } = await supabase
    .from('budget_documents')
    .update({ [columnName]: roleStatus })
    .eq('id', data.documentId)

  if (docError) {
    return { error: `Gagal mengupdate dokumen: ${docError.message}` }
  }

  // 7. Insert revision record
  const roleLabelMap: Record<string, string> = {
    bapperida: 'Bapperida',
    setda: 'Setda',
    anggaran: 'Bidang Anggaran BKAD',
    aset: 'Bidang Aset BKAD',
  }
  const roleName = roleLabelMap[requiredRole] || requiredRole
  const actionName = data.action === 'approve' ? 'Menyetujui' : data.action === 'revision' ? 'Meminta Revisi' : 'Menolak'

  const { error: revError } = await supabase.from('revisions').insert({
    budget_id: data.budgetId,
    document_id: data.documentId,
    reviewer_id: user.id,
    from_status: 'under_review',
    to_status: 'under_review',
    comments: `[${roleName}] - ${actionName}: ${data.comments}`,
  })

  if (revError) {
    console.error('Failed to insert revision:', revError)
  }

  // 8. Recalculate global budget status
  const { data: allDocs } = await supabase
    .from('budget_documents')
    .select('review_bapperida, review_setda, review_anggaran, review_aset')
    .eq('budget_id', data.budgetId)

  if (allDocs && allDocs.length > 0) {
    let hasRejected = false
    let hasRevision = false
    let allApproved = true

    for (const doc of allDocs) {
      const statuses = [doc.review_bapperida, doc.review_setda, doc.review_anggaran, doc.review_aset]
      if (statuses.includes('rejected')) hasRejected = true
      if (statuses.includes('revision')) hasRevision = true
      if (!statuses.every((s: string | null) => s === 'approved')) allApproved = false
    }

    let newStatus = 'under_review'
    if (hasRejected) newStatus = 'rejected'
    else if (hasRevision) newStatus = 'revision'
    else if (allApproved) newStatus = 'approved'

    await supabase.from('budgets').update({
      status: newStatus,
      reviewed_by: user.id,
      review_date: new Date().toISOString(),
    }).eq('id', data.budgetId)

    // P1: Auto-notification to submitter
    const { data: budget } = await supabase
      .from('budgets')
      .select('submitted_by, title')
      .eq('id', data.budgetId)
      .single()

    if (budget?.submitted_by) {
      const notifTypeMap: Record<string, string> = {
        approve: 'approval',
        revision: 'revision_request',
        reject: 'rejection',
      }
      const notifTitleMap: Record<string, string> = {
        approve: `Dokumen Disetujui oleh ${roleName}`,
        revision: `Revisi Diminta oleh ${roleName}`,
        reject: `Dokumen Ditolak oleh ${roleName}`,
      }

      await supabase.from('notifications').insert({
        user_id: budget.submitted_by,
        title: notifTitleMap[data.action] || 'Update Status',
        message: `Pengajuan "${budget.title}" — ${actionName} oleh ${roleName}: ${data.comments}`,
        type: notifTypeMap[data.action] || 'status_change',
        related_budget_id: data.budgetId,
        is_read: false,
      })
    }
  }

  return { success: true, roleName }
}
