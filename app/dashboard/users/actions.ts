'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * P0: Server-side user approval action.
 * Only superadmin can approve/reject new user registrations.
 */
export async function approveUserAction(userId: string, approved: boolean) {
  const supabase = await createClient()

  // 1. Authenticate
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Tidak terautentikasi.' }
  }

  // 2. Verify caller is admin
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role, admin_role')
    .eq('id', user.id)
    .single()

  if (!adminProfile || adminProfile.role !== 'admin') {
    return { error: 'Akses ditolak. Hanya administrator yang bisa menyetujui pengguna.' }
  }

  // 3. Update approval status
  const { error } = await supabase
    .from('profiles')
    .update({ is_approved: approved })
    .eq('id', userId)

  if (error) {
    return { error: `Gagal mengubah status: ${error.message}` }
  }

  // 4. Notify the user
  await supabase.from('notifications').insert({
    user_id: userId,
    title: approved ? 'Akun Anda Telah Disetujui' : 'Pendaftaran Ditolak',
    message: approved
      ? 'Selamat! Akun Anda telah disetujui oleh administrator. Anda sekarang dapat mengakses sistem SIVRON.'
      : 'Maaf, pendaftaran akun Anda ditolak oleh administrator. Silakan hubungi admin untuk informasi lebih lanjut.',
    type: approved ? 'info' : 'warning',
    is_read: false,
  })

  return { success: true }
}

/**
 * P0: Fetch pending approval users (server action).
 */
export async function fetchPendingUsersAction() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tidak terautentikasi.', users: [] }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return { error: 'Akses ditolak.', users: [] }
  }

  const { data: users } = await supabase
    .from('profiles')
    .select('*, institution:institutions(name)')
    .eq('is_approved', false)
    .eq('role', 'user')
    .order('created_at', { ascending: false })

  return { users: users || [] }
}
