# SIVRON - Aplikasi Verifikasi RKA/DPA

SIVRON adalah platform *e-budgeting* dan verifikasi dokumen pengajuan RKA (Rencana Kerja dan Anggaran) dan DPA (Dokumen Pelaksanaan Anggaran) untuk berbagai instansi pemerintah daerah. Sistem ini dirancang untuk mendukung pengajuan dokumen oleh 50+ instansi dan diverifikasi oleh 4 lapis admin:
1. Bapperida
2. Setda
3. Bidang Anggaran BKAD
4. Bidang Aset BKAD

## Dokumentasi Teknis

Untuk memudahkan AI model dan programmer memahami arsitektur, *business logic*, dan cara kerja program ini, silakan baca dokumentasi lengkap di direktori `docs/`:

- [Arsitektur & Panduan Pengembangan (docs/SIVRON_ARCHITECTURE.md)](docs/SIVRON_ARCHITECTURE.md) - **WAJIB DIBACA** sebelum melakukan modifikasi *core logic*.

## Tech Stack Utama

- **Framework**: [Next.js 14+ (App Router)](https://nextjs.org/)
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL, Supabase Auth, Storage)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [Radix UI](https://www.radix-ui.com/) + custom components di `components/ui/`
- **Icons**: [Lucide React](https://lucide.dev/)
- **Testing**: Vitest (Unit Tests)

## Persiapan Menjalankan Secara Lokal

1. Salin `.env.example` ke `.env.local` (buat jika belum ada) dan isi dengan *keys* Supabase Anda.
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

2. Install dependencies:
```bash
npm install
# atau
pnpm install
```

3. Jalankan server development:
```bash
npm run dev
# atau
pnpm dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

## Prosedur Pengembangan (Untuk Programmer / AI)

Setiap kali ada fitur baru yang ditambahkan, **pastikan untuk selalu mengupdate** dokumentasi di `docs/SIVRON_ARCHITECTURE.md` agar arsitektur dan status aplikasi tetap *up-to-date*.
