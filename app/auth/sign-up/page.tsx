'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Field, FieldLabel, FieldMessage } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Shield, Lock, ArrowRight } from 'lucide-react'
import type { Institution } from '@/lib/types/database'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [institutionId, setInstitutionId] = useState('')
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingInstitutions, setIsLoadingInstitutions] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function fetchInstitutions() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('institutions')
        .select('*')
        .order('name')

      if (error) {
        console.error('Error fetching institutions:', error)
      } else if (data) {
        setInstitutions(data)
      }
      setIsLoadingInstitutions(false)
    }
    fetchInstitutions()
  }, [])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    if (password !== repeatPassword) {
      setError('Password tidak cocok')
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password minimal 6 karakter')
      setIsLoading(false)
      return
    }

    if (!institutionId) {
      setError('Silakan pilih instansi')
      setIsLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
            `${window.location.origin}/auth/callback`,
          data: {
            institution_id: institutionId,
            role: 'user',
          },
        },
      })
      if (error) throw error
      router.push('/auth/sign-up-success')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Terjadi kesalahan saat mendaftar')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 pt-24 md:p-8 bg-[#f8fbff] relative diamond-pattern overflow-x-hidden">
      {/* BKAD Logo Absolute Overlay */}
      <div className="absolute top-4 left-4 md:top-8 md:left-8 z-20 flex items-center gap-2 md:gap-3 bg-white/80 backdrop-blur-md px-3 py-1.5 md:px-4 md:py-2 rounded-full shadow-sm border border-gray-100">
        <Image src="/bkad-logo.jpeg" alt="BKAD Logo" width={24} height={24} className="object-contain md:w-[32px] md:h-[32px]" />
        <span className="font-heading font-bold text-gray-800 text-xs md:text-sm tracking-wide">SIVRON</span>
        <span className="font-heading font-bold text-gray-800 text-xs md:text-sm hidden sm:block tracking-wide">— BKAD</span>
      </div>

      {/* Floating Centered Card */}
      <div className="flex w-full max-w-5xl bg-white rounded-2xl md:rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden min-h-[500px] md:min-h-[650px] relative z-10 border border-gray-100/50">

        {/* Left Panel - Dark SIVRON Branding replacing old E-budgeting */}
        <div className="hidden lg:flex flex-col w-1/2 p-12 bg-[#0A0A0F] text-white overflow-hidden relative justify-center items-center">
          <div className="absolute inset-0 bg-[url('/diamond-pattern.svg')] opacity-5 z-0" />
          <div className="absolute inset-x-0 bottom-0 pointer-events-none neon-border opacity-30 h-1/2 z-0" />

          <div className="relative z-10 text-center max-w-md mx-auto">
            <div className="mx-auto flex items-center justify-center w-20 h-20 bg-white rounded-2xl mb-8 shadow-[0_0_30px_rgba(255,255,255,0.2)] p-2">
              <Image src="/logo-anggaran-2.jpeg" alt="SIVRON Logo" width={64} height={64} className="object-contain rounded-xl" />
            </div>
            <h1 className="font-heading text-5xl font-bold tracking-tighter mb-4 text-glow">
              SIVRON<span className="text-sky-500">.</span>
            </h1>
            <p className="font-sans text-base text-white/70 leading-relaxed">
              Bergabung bersama kami untuk kelola Sistem Verifikasi RKA Online.
            </p>

            <div className="mt-8 inline-flex items-center justify-center gap-2 bg-sky-500/10 text-sky-400 px-5 py-2.5 rounded-full border border-sky-500/20 text-xs font-mono w-full max-w-[280px]">
              <Lock className="w-4 h-4" /> Sistem Keamanan Terenkripsi
            </div>
          </div>
        </div>

        {/* Right Panel - Form */}
        <div className="w-full lg:w-1/2 p-6 md:p-10 lg:p-12 bg-white flex flex-col justify-center max-h-[90vh] overflow-y-auto custom-scrollbar">

          <div className="mb-8 text-left">
            <h2 className="font-heading text-3xl font-bold text-gray-900 mb-2">Pendaftaran Akun</h2>
            <div className="w-12 h-1 bg-sky-500 rounded-full mb-3"></div>
            <p className="text-sm text-gray-500 leading-relaxed">Lengkapi kelengkapan data diri dan instansi Anda di bawah ini.</p>
          </div>

          <form onSubmit={handleSignUp} className="space-y-5">
            <Field>
              <FieldLabel htmlFor="email" className="font-bold text-xs text-gray-700 mb-1.5 block">
                Email <span className="text-sky-600">*</span>
              </FieldLabel>
              <Input
                id="email"
                type="email"
                placeholder="nama@instansi.go.id"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-4 h-11 bg-white border-gray-200 rounded-xl focus-visible:ring-sky-500 focus-visible:border-sky-500 transition-all text-sm"
                disabled={isLoading}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="institution" className="font-bold text-xs text-gray-700 mb-1.5 block">
                Instansi <span className="text-sky-600">*</span>
              </FieldLabel>
              <Select value={institutionId} onValueChange={setInstitutionId} disabled={isLoading || isLoadingInstitutions}>
                <SelectTrigger id="institution" className="w-full h-11 bg-white border-gray-200 rounded-xl focus:ring-sky-500 focus:border-sky-500 text-sm">
                  <SelectValue placeholder={isLoadingInstitutions ? "Memuat..." : "Pilih instansi"} />
                </SelectTrigger>
                <SelectContent>
                  {institutions.length === 0 && !isLoadingInstitutions ? (
                    <div className="p-4 text-sm text-center text-muted-foreground">
                      Tidak ada instansi ditemukan.
                    </div>
                  ) : (
                    institutions.map((inst) => (
                      <SelectItem key={inst.id} value={inst.id}>
                        {inst.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field>
                <FieldLabel htmlFor="password" className="font-bold text-xs text-gray-700 mb-1.5 block">
                  Password <span className="text-sky-600">*</span>
                </FieldLabel>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimal 6 char"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-4 h-11 bg-white border-gray-200 rounded-xl focus-visible:ring-sky-500 focus-visible:border-sky-500 transition-all text-sm"
                  disabled={isLoading}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="repeatPassword" className="font-bold text-xs text-gray-700 mb-1.5 block">
                  Ulangi Sandi <span className="text-sky-600">*</span>
                </FieldLabel>
                <Input
                  id="repeatPassword"
                  type="password"
                  placeholder="Ulangi sandi"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                  className="pl-4 h-11 bg-white border-gray-200 rounded-xl focus-visible:ring-sky-500 focus-visible:border-sky-500 transition-all text-sm"
                  disabled={isLoading}
                />
              </Field>
            </div>

            {error && (
              <FieldMessage className="text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 text-sm mt-2">
                {error}
              </FieldMessage>
            )}

            <Button
              type="submit"
              className="w-full h-12 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold tracking-wide text-sm mt-6 transition-all shadow-lg shadow-sky-600/30"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  MEMPROSES...
                </>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  Daftar Sekarang <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              )}
            </Button>

            <div className="mt-8 text-center text-sm">
              <span className="text-gray-500">Sudah punya akun? </span>
              <Link
                href="/auth/login"
                className="font-bold text-sky-600 hover:text-sky-700 transition-colors"
              >
                Masuk disini
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
