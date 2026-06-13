# 3D Snake Game

3D Snake Game adalah game Snake berbasis web dengan tampilan 3D menggunakan Three.js. Pemain menggerakkan ular di dalam arena grid, memakan orb/food untuk menambah skor, dan menghindari tabrakan dengan dinding atau tubuh sendiri.

Project ini dibuat dengan HTML, CSS, dan JavaScript murni tanpa proses build tambahan.

## Preview Fitur

- Gameplay Snake dalam arena 3D.
- Rendering 3D menggunakan Three.js.
- Kontrol keyboard, WASD, dan swipe untuk perangkat mobile.
- Efek suara saat mulai bermain, makan food, dan tabrakan.
- Efek partikel saat ular memakan food.
- Efek ledakan dan camera shake saat game over.
- Tampilan UI modern dengan glassmorphism.
- Penyimpanan high score menggunakan `localStorage`.
- Kamera dapat diputar manual menggunakan mouse drag atau two-finger drag di layar sentuh.
- Responsive dan dapat dimainkan di desktop maupun mobile browser.

## Teknologi yang Digunakan

- HTML5
- CSS3
- JavaScript
- Three.js r128 melalui CDN
- Web Audio API
- Browser `localStorage`

## Struktur Project

```text
.
├── index.html
├── style.css
├── script.js
└── README.md
```

> Catatan: Jika file HTML masih bernama `index(3).html`, sebaiknya ubah namanya menjadi `index.html` agar lebih rapi dan mudah dijalankan/deploy.

## Cara Menjalankan

### Cara 1: Langsung dari File

1. Pastikan file berikut berada dalam satu folder:
   - `index.html`
   - `style.css`
   - `script.js`
2. Buka file `index.html` menggunakan browser modern seperti Chrome, Edge, Firefox, atau Brave.
3. Klik tombol **PLAY** untuk mulai bermain.

### Cara 2: Menggunakan Local Server

Cara ini lebih direkomendasikan, terutama jika nanti project dikembangkan lebih lanjut.

Jika menggunakan Python:

```bash
python -m http.server 8000
```

Lalu buka browser:

```text
http://localhost:8000
```

Jika menggunakan VS Code, bisa juga memakai extension **Live Server**, lalu klik kanan pada `index.html` dan pilih **Open with Live Server**.

## Kontrol Game

| Perangkat | Kontrol |
|---|---|
| Keyboard | Arrow Keys |
| Keyboard | W, A, S, D |
| Mobile | Swipe ke atas, bawah, kiri, kanan |
| Mouse | Drag untuk memutar kamera |
| Touchscreen | Two-finger drag untuk memutar kamera |

## Cara Bermain

1. Klik tombol **PLAY**.
2. Arahkan ular menuju orb/food berwarna oranye.
3. Setiap food yang dimakan akan menambah skor.
4. Ular akan semakin panjang setelah makan food.
5. Hindari menabrak dinding arena.
6. Hindari menabrak tubuh sendiri.
7. Jika menabrak, game akan menampilkan efek ledakan lalu masuk ke layar **GAME OVER**.
8. Klik **PLAY AGAIN** untuk bermain ulang.

## Pengaturan Game

Beberapa pengaturan utama berada di bagian `CONFIG` pada file `script.js`.

```js
const CONFIG = {
    gridSize: 16,
    cellSize: 1,
    moveInterval: 180,
    initialLength: 3,
    foodGlowColor: 0xff6633,
    snakeColors: [0x44ddff, 0x33bbee, 0x2299dd, 0x44ddbb, 0x66eecc],
};
```

Keterangan:

| Properti | Fungsi |
|---|---|
| `gridSize` | Ukuran arena game. Default 16x16. |
| `cellSize` | Ukuran tiap cell/grid. |
| `moveInterval` | Kecepatan gerak ular dalam milidetik. Semakin kecil, semakin cepat. |
| `initialLength` | Panjang awal ular. |
| `foodGlowColor` | Warna glow pada food. |
| `snakeColors` | Daftar warna tubuh ular. |

## Fitur Utama dalam Kode

### 1. Scene 3D

Game membuat scene Three.js lengkap dengan kamera, renderer, lighting, grid arena, dinding pembatas, dan objek 3D untuk ular serta food.

### 2. Sistem Skor

Skor bertambah ketika ular memakan food. High score disimpan secara lokal menggunakan `localStorage`, sehingga skor terbaik tetap tersimpan di browser yang sama.

### 3. Input Queue

Game menggunakan sistem input queue agar kontrol terasa lebih responsif. Arah input dari keyboard atau swipe akan dimasukkan ke antrean sebelum diproses oleh pergerakan ular.

### 4. Efek Audio

Audio dibuat langsung dengan Web Audio API, tanpa file audio eksternal. Efek suara dibuat untuk:

- Opening/start game.
- Saat ular memakan food.
- Saat ular menabrak dan game over.
- Ambient pulse selama game berjalan.

### 5. Efek Partikel

Saat food dimakan, game memunculkan partikel kecil. Saat game over, muncul partikel tabrakan dan efek ledakan pada tubuh ular.

### 6. Camera Shake dan Explosion

Ketika ular menabrak, kamera akan bergetar dan tubuh ular akan terpental sebagai efek ledakan sebelum layar game over muncul.

## Catatan Penting

- Project membutuhkan koneksi internet jika masih menggunakan Three.js dari CDN.
- Jika ingin menjalankan full offline, download file Three.js dan hubungkan secara lokal di `index.html`.
- Beberapa browser hanya mengizinkan audio aktif setelah user melakukan interaksi, karena itu suara dimulai setelah tombol **PLAY** ditekan.
- Untuk deployment, gunakan nama file `index.html` agar langsung terbaca oleh hosting seperti GitHub Pages, Netlify, atau Vercel.

## Deploy ke GitHub Pages

1. Buat repository baru di GitHub.
2. Upload file:
   - `index.html`
   - `style.css`
   - `script.js`
   - `README.md`
3. Buka menu **Settings** repository.
4. Pilih **Pages**.
5. Pada bagian source, pilih branch `main` dan folder `/root`.
6. Simpan pengaturan.
7. Tunggu sampai GitHub Pages memberikan link website.

## Troubleshooting

### Game tidak tampil

Pastikan:

- File `style.css` dan `script.js` berada satu folder dengan `index.html`.
- Nama file sudah sesuai dengan yang dipanggil di HTML.
- Browser mendukung WebGL.
- Koneksi internet aktif jika masih memakai Three.js CDN.

### Kontrol tidak bergerak

Pastikan game sudah dimulai dengan menekan tombol **PLAY**. Kontrol keyboard dan swipe hanya aktif ketika game sedang berjalan.

### Suara tidak muncul

Beberapa browser memblokir audio sebelum user melakukan interaksi. Klik **PLAY** terlebih dahulu agar Web Audio API dapat aktif.

### High score tidak tersimpan

High score disimpan di `localStorage`. Jika browser memakai mode incognito/private atau data situs dibersihkan, high score bisa hilang.

## Rekomendasi Pengembangan Lanjutan

- Tambahkan tombol pause/resume.
- Tambahkan pilihan level difficulty.
- Tambahkan mode full offline tanpa CDN.
- Tambahkan leaderboard lokal.
- Tambahkan menu pengaturan audio.
- Tambahkan pilihan tema warna arena.
- Tambahkan countdown sebelum game dimulai.
- Tambahkan indikator speed ketika skor semakin tinggi.

## Lisensi

Project ini dapat digunakan dan dimodifikasi untuk kebutuhan belajar, latihan, atau pengembangan lebih lanjut.
