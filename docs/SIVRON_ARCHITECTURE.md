# SIVRON - Panduan Arsitektur & Pengembangan

Dokumen ini adalah referensi utama untuk programmer atau Model AI (seperti saya) dalam mengembangkan aplikasi SIVRON. Selalu baca dokumen ini untuk memahami struktur data dan alur logika aplikasi sebelum melakukan perubahan.

---

## 1. Konsep Dasar Aplikasi
SIVRON adalah aplikasi Verifikasi RKA/DPA yang memungkinkan berbagai Instansi (pengguna biasa) mengunggah dokumen pengajuan anggaran (budget) yang kemudian akan di-*review* oleh 4 level admin (Bapperida, Setda, Bidang Anggaran BKAD, dan Bidang Aset BKAD).

- **Pengguna Biasa (User)**: Perwakilan dari berbagai Instansi. Bisa membuat "Budgets" (Pengajuan), mengunggah dokumen (RKA/DPA & Nota Dinas), dan merevisi dokumen jika ditolak/diminta revisi oleh admin.
- **Admin**: Terdiri dari beberapa role (`admin_role`):
  - `superadmin`: Punya akses penuh (termasuk *approve* pendaftaran akun, mengubah role user).
  - `bapperida`, `setda`, `anggaran`, `aset`: Hanya bisa melakukan *review* di bidang masing-masing pada dokumen yang diajukan Instansi.

---

## 2. Struktur Database (Supabase PostgreSQL)

Berikut adalah tabel-tabel utama di Supabase:

1. **`institutions`**: Data instansi. (Relasi ke Profiles)
2. **`fiscal_years`**: Data tahun anggaran aktif.
3. **`profiles`**: Ekstensi dari `auth.users` bawaan Supabase.
   - Kolom penting: `role` ('admin', 'user'), `admin_role` ('superadmin', 'bapperida', dll), `institution_id`, `is_approved` (boolean untuk menahan akses login hingga disetujui admin).
4. **`budgets`**: Tabel pengajuan RKA/DPA.
   - Kolom penting: `status` ('draft', 'submitted', 'under_review', 'revision', 'approved', 'rejected').
5. **`budget_documents`**: File yang dilampirkan dalam pengajuan.
   - Menyimpan *review status* dari tiap admin: `review_bapperida`, `review_setda`, `review_anggaran`, `review_aset`.
6. **`revisions`**: Log komentar dan alasan penolakan/revisi dari admin ke instansi.
7. **`notifications`**: Tabel untuk menampung *in-app notifications*.
8. **`audit_logs`**: Log aktivitas (*insert*, *update*, *delete*).

---

## 3. Keamanan & Akses Data (Security)

Sistem menggunakan konsep **Defense in Depth**:

1. **Middleware (`middleware.ts`)**: Mencegah akses rute `/dashboard/` bagi user yang belum login atau `is_approved = false`. Mencegah akses ke menu-menu khusus admin bagi user biasa.
2. **Server Actions (P0 Security Update)**:
   - Validasi Hak Akses (Otorisasi) **TIDAK** dilakukan di Client/Browser. 
   - Semua *update* krusial (seperti proses review dokumen, pembuatan budget) dialihkan ke **Server Actions** (`app/.../actions.ts`).
   - Server Actions akan mengambil *session* langsung dari Supabase, mengecek tabel `profiles` server-side, dan hanya mengeksekusi *query* jika role valid. (Menghindari eksploitasi *manipulasi UI*).
3. **Row Level Security (RLS)**: Diaplikasikan langsung di DB Supabase untuk memastikan Instansi hanya bisa melihat/mengedit pengajuannya sendiri, sementara Admin bisa melihat semuanya.

---

## 4. Alur Kerja (Workflows) Utama

### A. Alur Registrasi Akun Baru
1. Instansi mendaftar melalui halaman Register.
2. Akun terbuat di `auth.users` dan otomatis `profiles` terbuat dengan `is_approved = false`.
3. User login, diarahkan ke halaman `/dashboard/pending-approval`.
4. Superadmin membuka halaman `/dashboard/users`, klik "Setujui".
5. Status `is_approved` menjadi `true`, user bisa masuk dashboard.

### B. Alur Pengajuan Anggaran
1. Instansi membuat pengajuan. Data `institution_id` divalidasi dan diambil langsung dari session di Server Action, bukan dari input client.
2. Dokumen RKA/DPA dan Nota Dinas diunggah secara *client-side* ke Supabase Storage (karena berupa binary data).
3. Record dimasukkan ke `budget_documents`.
4. Status Budget diubah menjadi `submitted`. (Trigger otomatis membuat Notifikasi ke Admin).

### C. Alur Verifikasi & Revisi
1. Admin (misal Bapperida) melihat dokumen yang di-*submit*.
2. Admin mengisi komentar dan memilih "Setuju" atau "Revisi".
3. Aksi ini memanggil Server Action `submitReviewAction` (Validasi: apakah admin_role caller adalah `bapperida` atau `superadmin`?).
4. Jika valid, update tabel `budget_documents` kolom `review_bapperida`.
5. Insert ke tabel `revisions`.
6. Status global tabel `budgets` dihitung ulang. Jika ada 1 "revisi", status global menjadi `revision`. (Trigger otomatis membuat Notifikasi ke Instansi).

### D. Alur Submit Ulang (Resubmit setelah Revisi)
1. Instansi mengklik tombol "Edit & Revisi".
2. Menambah/menghapus file.
3. Klik "Ajukan Ulang".
4. Server action mengubah status budget menjadi `submitted` kembali, dan **MENGHAPUS/MERESET** semua kolom review (`review_bapperida`, dll) di `budget_documents` menjadi `null`/`pending`. Admin harus mereview ulang.

---

## 5. Standar Performa & Skalabilitas (Skala 50+ Instansi)

- **Pagination (Server-Side)**: Halaman-halaman dengan beban data berat (`manage-budgets`, `audit-log`) TIDAK boleh me-load seluruh data (`.select('*')`) tanpa batas. Wajib menggunakan `range(from, to)` (Server-Side Pagination).
- **Debouncing**: Input pencarian (*Search*) diwajibkan menggunakan custom hook `useDebounce` (delay 400ms) untuk mencegah *flooding* *API Calls* ke Supabase di setiap ketikan *keystroke*.

---

## 6. Struktur Folder Kode
- `/app/`: Halaman, rute, dan Server Actions (menggunakan Next.js App Router).
- `/components/`: Komponen UI modular (Radix UI + Tailwind).
- `/hooks/`: Custom hooks React (seperti `use-debounce.ts`, `use-profile.ts`).
- `/lib/supabase/`: Konfigurasi client/server/middleware Supabase.
- `/lib/types/`: Definisi TypeScript (Type data database).
- `/supabase/migrations/`: File SQL untuk *database schema* dan *policies*.

---

## 7. Instruksi untuk AI
Jika pengguna meminta perubahan pada aplikasi:
1. Pahami alur bisnis pada poin ke-4.
2. Selalu patuhi standar keamanan pada poin ke-3 (Jangan validasi bisnis krusial di komponen Client!).
3. Gunakan/perbarui komponen UI dari `components/ui/` agar konsisten.
4. **PENTING**: Jika kamu membuat perubahan signifikan pada arsitektur, database, atau logika, **jangan lupa memperbarui file dokumentasi ini!**
