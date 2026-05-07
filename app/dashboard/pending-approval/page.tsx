'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Clock, LogOut } from 'lucide-react'
import Image from 'next/image'

export default function PendingApprovalPage() {
  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50/50 p-4">
      <Card className="max-w-md w-full border-0 shadow-lg rounded-2xl overflow-hidden">
        <div className="bg-sky-500/5 border-b border-sky-100 p-6 text-center">
          <div className="mx-auto flex items-center justify-center w-16 h-16 bg-white rounded-2xl mb-4 shadow-sm p-2">
            <Image src="/logo-anggaran-2.jpeg" alt="SIVRON" width={48} height={48} className="object-contain rounded-xl" />
          </div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            SIVRON<span className="text-sky-500">.</span>
          </h1>
        </div>
        <CardContent className="p-8 text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center">
            <Clock className="h-8 w-8 text-amber-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Menunggu Persetujuan</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Akun Anda telah terdaftar dan sedang menunggu persetujuan dari administrator. 
              Anda akan dapat mengakses sistem setelah akun disetujui.
            </p>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
            <p className="text-xs text-amber-800 font-medium">
              Proses persetujuan biasanya memerlukan waktu 1-2 hari kerja. 
              Jika sudah lewat dari waktu tersebut, silakan hubungi administrator BKAD.
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={handleLogout}
            className="w-full rounded-xl h-11 font-bold"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Keluar
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
