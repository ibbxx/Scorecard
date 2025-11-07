## Score Card Analytics Dashboard

Dashboard statis yang meniru tampilan Google Analytics untuk menampilkan metrik *score card* (pengguna aktif, jumlah peristiwa, sesi, tampilan) beserta grafik interaktif yang otomatis mengikuti angka inputan.

### Struktur Proyek

- `index.html` – markup utama dashboard.
- `styles.css` – styling yang menyerupai UI GA.
- `app.js` – logika Chart.js, binding input, dan perhitungan persen perubahan.

Semua aset bersifat statis sehingga cocok untuk di-*deploy* di layanan hosting statis gratis.

---

## Step-by-Step Deploy ke GitHub Pages

1. **Siapkan Git lokal**
   ```bash
   cd /path/ke/project
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Buat repositori kosong di GitHub**
   - Masuk ke https://github.com/new
   - Isi *Repository name* (contoh: `scorecard-analytics`)
   - Pilih visibilitas (Public disarankan agar Pages gratis)
   - Klik **Create repository**

3. **Sambungkan repo lokal ke GitHub**
   ```bash
   git branch -M main
   git remote add origin https://github.com/<username>/scorecard-analytics.git
   ```

4. **Kirim kode ke GitHub**
   ```bash
   git push -u origin main
   ```

5. **Aktifkan GitHub Pages**
   - Buka repo → tab **Settings → Pages**
   - Pada *Build and deployment*, set:
     - Source: **Deploy from a branch**
     - Branch: `main`
     - Folder: `/ (root)`
   - Klik **Save**

6. **Tunggu proses publikasi**
   - GitHub membuat versi statis otomatis (biasanya <1 menit)
   - Lihat status “Your site is published at …”

7. **Akses situs**
   - URL standar: `https://<username>.github.io/scorecard-analytics/`
   - Bagikan tautan tersebut untuk menampilkan dashboard di internet.

> **Tips:** Setiap perubahan baru cukup `git add . && git commit -m "..." && git push`. GitHub Pages akan memperbarui situs secara otomatis.

---

## Alternatif Hosting Gratis

| Layanan  | Cara singkat                                                                 |
|----------|------------------------------------------------------------------------------|
| Netlify  | `netlify deploy --prod` atau drag `index.html` ke panel Deploy.              |
| Vercel   | `vercel` dari root proyek (pilih framework “Other”).                        |
| Cloudflare Pages | Sambungkan repo GitHub, pilih branch, langsung build statis. |

Semua layanan di atas cukup menunjuk ke root direktori karena aplikasi tidak memerlukan proses build.

---

## Pengembangan Lokal

1. Jalankan server statis (contoh dengan `npx serve` atau Live Server VS Code).
2. Buka `http://localhost:3000` (atau port yang digunakan).
3. Edit angka pada kartu metrik untuk melihat grafik & persentase berubah otomatis.

Selamat mencoba! 🎉
