'use client'


import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ArrowRight } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"

export default function LandingPage() {
  return (
    <main className="dark relative min-h-screen w-full bg-[#0A0A0F] text-white selection:bg-sky-500/30 overflow-x-hidden">
      {/* Neon Glow Frame */}
      <div className="fixed inset-0 pointer-events-none z-50 neon-border opacity-50" />

      {/* Background Effect Removed (Three.js dependency removed) */}
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-[#0A0A0F] to-[#0A0A0F]/80" />

      {/* Header Navigation */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-[#0A0A0F]/50 backdrop-blur-md border-b border-white/5">
        <div className="container mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 bg-white rounded p-1 shadow-sm">
              <Image src="/logo-anggaran-2.jpeg" alt="SIVRON" width={32} height={32} className="object-contain rounded-lg w-full h-full" />
            </div>
            <div className="flex flex-col">
              <span className="font-heading font-bold text-lg md:text-xl tracking-wider uppercase flex items-center">
                SIVRON<span className="text-sky-500">.</span>
              </span>
              <span className="text-[10px] tracking-widest text-white/50 uppercase hidden sm:block">Sistem Verifikasi RKA Online</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <Link href="#portal" className="text-xs font-mono tracking-widest hover:text-sky-500 transition-colors">PORTAL</Link>
            <Link href="#presence" className="text-xs font-mono tracking-widest hover:text-sky-500 transition-colors">PRESENCE</Link>
          </nav>

          <Button asChild className="rounded-full bg-white text-black hover:bg-gray-200 uppercase tracking-widest text-[9px] sm:text-[10px] md:text-xs px-3 sm:px-4 md:px-6 h-7 sm:h-8 md:h-10 font-bold transition-transform hover:scale-105 shrink-0">
            <Link href="/auth/login">Akses Portal</Link>
          </Button>
        </div>
      </header>

      {/* Main Content Scrollable Area */}
      <div className="relative z-10 w-full pt-20">
        
        {/* Hero Section */}
        <section id="portal" className="min-h-[85vh] flex flex-col items-center justify-center relative px-2 sm:px-4">
          {/* Subtle Radial Glow */}
          <div
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute top-1/2 left-1/2 size-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full',
              'bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.1),transparent_60%)]',
              'blur-[60px]',
              '-z-10'
            )}
          />

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h2 className="font-mono text-xs sm:text-sm tracking-[0.2em] sm:tracking-[0.4em] text-sky-500 mb-6">SISTEM VERIFIKASI RKA ONLINE</h2>
            <h1 className="font-heading text-5xl sm:text-6xl md:text-8xl lg:text-9xl font-bold tracking-tighter mb-4 text-glow transition-all">
              SIVRON<span className="text-sky-500">.</span>
            </h1>
          </motion.div>
        </section>


        
        {/* Call to Action Footer */}
        <section className="py-24 relative bg-[#050508] flexflex-col items-center justify-center text-center px-4 border-t border-white/5">
          <h2 className="font-heading text-4xl md:text-5xl font-bold mb-8">Siap Melakukan Verifikasi?</h2>
          <Button asChild className="rounded-full bg-sky-500 hover:bg-sky-600 text-white font-bold h-14 px-10 text-sm tracking-widest transition-transform hover:scale-105 neon-border-sky">
            <Link href="/auth/login" className="flex items-center">
              BUKA AKSES PORTAL <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </Button>
        </section>

        {/* Minimal Footer */}
        <footer className="py-8 bg-black border-t border-white/5 text-center">
          <p className="font-mono text-[10px] text-white/30 tracking-widest uppercase">
            &copy; {new Date().getFullYear()} SIVRON SISTEM VERIFIKASI RKA ONLINE - v2.1.0
          </p>
        </footer>
      </div>
    </main>
  )
}

