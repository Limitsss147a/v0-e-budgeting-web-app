'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/hooks/use-profile'
import { formatDate } from '@/lib/format'
import type { Profile, UserRole } from '@/lib/types/database'
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
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { Users, Search, Shield, User as UserIcon, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { approveUserAction } from './actions'

export default function UsersPage() {
  const { isAdmin, isLoading: profileLoading } = useProfile()
  const [users, setUsers] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [editUser, setEditUser] = useState<Profile | null>(null)
  const [newRole, setNewRole] = useState<UserRole>('user')
  const [newAdminRole, setNewAdminRole] = useState<string>('superadmin')

  useEffect(() => {
    if (!profileLoading && isAdmin) fetchUsers()
  }, [profileLoading, isAdmin])

  async function fetchUsers() {
    const supabase = createClient()
    setIsLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*, institution:institutions(name, code)')
      .order('created_at', { ascending: false })
    if (data) setUsers(data as Profile[])
    setIsLoading(false)
  }

  async function updateRole() {
    if (!editUser) return
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole, admin_role: newRole === 'admin' ? newAdminRole : null })
      .eq('id', editUser.id)

    if (error) {
      toast.error('Gagal mengubah role')
    } else {
      toast.success(`Role berhasil diubah ke ${newRole}`)
      setUsers(prev => prev.map(u => u.id === editUser.id ? { ...u, role: newRole, admin_role: newRole === 'admin' ? newAdminRole : null } : u))
      setEditUser(null)
    }
  }

  const filtered = users.filter(u =>
    !searchQuery ||
    (u.institution as any)?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!isAdmin && !profileLoading) {
    return <div className="flex flex-col items-center justify-center py-20"><Users className="h-12 w-12 text-muted-foreground/40 mb-3" /><h3 className="font-semibold text-lg">Akses Ditolak</h3></div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Kelola Pengguna</h1>
        <p className="text-muted-foreground">Daftar pengguna dan pengaturan role</p>
        {users.filter(u => !u.is_approved && u.role !== 'admin').length > 0 && (
          <Badge variant="destructive" className="mt-1 text-xs">
            <Clock className="mr-1 h-3 w-3" />
            {users.filter(u => !u.is_approved && u.role !== 'admin').length} menunggu persetujuan
          </Badge>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari nama atau instansi..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Instansi / Akun</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Terdaftar</TableHead>
                  <TableHead className="w-[120px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((user) => {
                  const instName = (user.institution as any)?.name || 'Admin'
                  const initials = instName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm">{instName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.role === 'admin' ? (
                          <Badge className="bg-green-100 text-green-800 border-0 text-[11px]"><CheckCircle2 className="mr-1 h-3 w-3" />Admin</Badge>
                        ) : user.is_approved ? (
                          <Badge className="bg-green-100 text-green-800 border-0 text-[11px]"><CheckCircle2 className="mr-1 h-3 w-3" />Disetujui</Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-800 border-0 text-[11px]"><Clock className="mr-1 h-3 w-3" />Menunggu</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="text-[11px]">
                          {user.role === 'admin' ? <><Shield className="mr-1 h-3 w-3" />Admin {user.admin_role && user.admin_role !== 'superadmin' ? `(${user.admin_role})` : ''}</> : <><UserIcon className="mr-1 h-3 w-3" />User</>}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(user.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {!user.is_approved && user.role !== 'admin' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-green-700 hover:text-green-800 hover:bg-green-50 text-xs font-bold"
                                onClick={async () => {
                                  const result = await approveUserAction(user.id, true)
                                  if (result.error) { toast.error(result.error) } else {
                                    toast.success(`${(user.institution as any)?.name || 'Akun'} telah disetujui`)
                                    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_approved: true } : u))
                                  }
                                }}
                              >Setujui</Button>
                            </>
                          )}
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setEditUser(user); setNewRole(user.role); setNewAdminRole(user.admin_role || 'superadmin'); }}>Ubah</Button>
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

      {/* Edit Role Dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Ubah Role Pengguna</DialogTitle>
            <DialogDescription>{(editUser?.institution as any)?.name || 'Admin'}</DialogDescription>
          </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Role Utama</p>
                <Select value={newRole} onValueChange={(v) => setNewRole(v as UserRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User (KPA / SKPD)</SelectItem>
                    <SelectItem value="admin">Admin (Validator)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {newRole === 'admin' && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Akses Verifikasi Admin</p>
                  <Select value={newAdminRole} onValueChange={setNewAdminRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="superadmin">Superadmin (Semua Akses)</SelectItem>
                      <SelectItem value="bapperida">Bapperida</SelectItem>
                      <SelectItem value="setda">Setda</SelectItem>
                      <SelectItem value="anggaran">Bidang Anggaran BKAD</SelectItem>
                      <SelectItem value="aset">Bidang Aset BKAD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Batal</Button>
            <Button onClick={updateRole}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
