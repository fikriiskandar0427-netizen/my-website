# Arus Finance — Manajemen Keuangan Usaha

Aplikasi web statis untuk pencatatan keuangan usaha. Dibuat dengan HTML5, CSS3, Bootstrap 5 CDN, Vanilla JavaScript, Chart.js CDN, dan localStorage.

## Cara menjalankan
1. Ekstrak `arus-finance.zip`.
2. Buka folder `keuangan-usaha`.
3. Klik dua kali `index.html`, atau jalankan melalui Live Server di VS Code.
4. Pastikan internet aktif saat pertama membuka agar Bootstrap, Chart.js, dan Google Fonts dari CDN dapat dimuat.

Tidak perlu Node.js, database, PHP, atau backend.

## File
- `index.html` — struktur halaman dan modal transaksi.
- `styles.css` — tema visual dan responsivitas.
- `app.js` — logika transaksi, localStorage, grafik, filter, CSV, backup/restore.

## Cara kerja saldo
- **Saldo kas** = total pemasukan − pengeluaran operasional.
- **Dana darurat** = total alokasi − total penarikan.
- **Kas operasional tersedia** = saldo kas − dana darurat.
- Alokasi dan penarikan dana darurat adalah perpindahan antarpos internal, bukan pemasukan atau pengeluaran usaha.

## Penyimpanan dan backup
Data otomatis tersimpan pada localStorage browser di perangkat yang digunakan. Data tidak otomatis tersinkron ke perangkat lain. Gunakan tombol **Backup JSON** untuk mengunduh cadangan dan **Restore JSON** untuk memulihkannya di perangkat/browser lain. Restore mengganti data yang sedang tersimpan.

## Catatan
- CSV menggunakan pemisah titik koma (`;`) agar lebih mudah dibuka di Excel dengan pengaturan regional Indonesia.
- Hapus data browser/site data dapat menghapus transaksi lokal. Lakukan backup secara berkala.
- Aplikasi ini adalah pencatatan operasional sederhana, bukan sistem akuntansi perpajakan atau pembukuan berstandar audit.
