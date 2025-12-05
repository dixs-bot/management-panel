# management-panel
📘 README — HealthStation (Termux Friendly Edition)

Sistem Manajemen Kepegawaian + Absensi ala Rumah Sakit
Backend JSON-DB + Frontend Static (HTML/CSS/JS)


---

📂 Daftar Isi

1. Tentang Project


2. Fitur Utama


3. Struktur Folder


4. Persyaratan Termux


5. Langkah Instalasi di Termux


6. Menjalankan Backend


7. Menjalankan Frontend


8. Testing API dengan cURL


9. Struktur DOM Frontend


10. Backup & Restore Database


11. Troubleshooting Lengkap







---

📌 Tentang Project

HealthStation adalah sistem mini untuk:

Absensi pegawai (hadir, izin, sakit, cuti, pulang)

Manajemen admin

Manajemen pegawai (biodata lengkap ala rumah sakit)

Rekap absensi bulanan + export CSV


Dirancang supaya bisa berjalan di Termux tanpa error (tanpa native build).


---

✨ Fitur Utama

✔ Login Admin / Pegawai
✔ Tambah Pegawai + Biodata Lengkap
✔ Tambah Admin
✔ Ubah Password
✔ Absensi: masuk, pulang, cuti, izin, sakit
✔ Absensi rentang tanggal
✔ Rekap absensi bulanan
✔ Export CSV rekap
✔ JSON database (tanpa database server — ringan & mudah backup)


---

📂 Struktur Folder

healthstation/
├── backend/
│   ├── server-jsondb.js        # Backend utama (Express + JSON DB)
│   ├── setup-admin.js          # Pembuat admin awal
│   ├── data/
│   │   └── db.json             # Database JSON (dibuat otomatis)
│   ├── package.json
│   └── .env (opsional)
│
├── frontend/
│   ├── index.html              # Halaman Login
│   ├── admin.html              # Panel Admin
│   ├── api-client.js
│   ├── auth.js
│   ├── admin-upgraded.js
│   └── theme-hospital.css
│
└── README.md


---

📱 Persyaratan Termux

Jalankan dulu:

pkg update && pkg upgrade
pkg install nodejs git python -y
termux-setup-storage

Opsional:

pkg install nano vim


---

🚀 Langkah Instalasi di Termux

Masuk ke folder project:

cd ~/healthstation/backend

Install dependensi:

npm install

Buat admin default:

node setup-admin.js admin@rumahsakit.or.id admin12345 "Admin Utama"

> Kamu bisa mengganti email/password admin kapan pun.




---

▶ Menjalankan Backend

Mode biasa:

cd ~/healthstation/backend
node server-jsondb.js

Mode background (jalan walau Termux di-minimize):

nohup node server-jsondb.js > server.log 2>&1 &

Cek apakah berjalan:

ps aux | grep server-jsondb

Default backend berjalan di:

👉 http://localhost:4001


---

🌐 Menjalankan Frontend

Buka tab Termux baru:

cd ~/healthstation/frontend
npx http-server . -p 8080 -c-1

Atau:

python3 -m http.server 8080

Buka browser Android:

👉 http://localhost:8080/index.html


---

🧪 Testing API dengan cURL

1) Login

curl -X POST http://localhost:4001/auth/login \
-H "Content-Type: application/json" \
-d '{"email":"admin@rumahsakit.or.id","password":"admin12345"}'

2) Simpan token otomatis

TOKEN=$(curl -s http://localhost:4001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@rumahsakit.or.id","password":"admin12345"}' \
  | jq -r .token)

3) Tambah Pegawai

curl -X POST http://localhost:4001/admin/users \
-H "Authorization: Bearer $TOKEN" \
-H "Content-Type: application/json" \
-d '{"email":"pegawai1@rs.com","name":"Budi","password":"123456","role":"staff"}'

4) Absensi

curl -X POST http://localhost:4001/attendance \
-H "Authorization: Bearer $TOKEN" \
-H "Content-Type: application/json" \
-d '{"status":"in"}'


---

🧩 Struktur DOM Frontend

index.html (Login)

<form id="loginForm">
  <input id="email" type="email" />
  <input id="password" type="password" />
  <button id="btnLogin">Masuk</button>
</form>

<script>window.API_BASE = 'http://localhost:4001'</script>
<script src="api-client.js"></script>
<script src="auth.js"></script>

admin.html (Panel Admin)

Panel menggunakan section switching:

<aside class="sidebar">
  <a data-section="dashboard">Dashboard</a>
  <a data-section="users">User Management</a>
  <a data-section="admins">Admin</a>
  <a data-section="attendance">Absensi</a>
</aside>

<main>
  <div id="dashboard" class="section"></div>
  <div id="users" class="section d-none"></div>
  <div id="admins" class="section d-none"></div>
  <div id="attendance" class="section d-none"></div>
</main>

Modal yang digunakan:

#modalUser

#modalPwd

#modalUserDetail

#modalAddStatus



---

💾 Backup & Restore Database

Backup file DB:

cp ~/healthstation/backend/data/db.json ~/storage/shared/Download/backup-db.json

Restore:

cp ~/storage/shared/Download/backup-db.json ~/healthstation/backend/data/db.json

Restart backend:

pkill -f server-jsondb.js
node server-jsondb.js


---

🛠 Troubleshooting Lengkap

❌ Backend tidak mau start

Penyebab umum: port sudah dipakai

Cek port:

lsof -i :4001

Kill prosesnya:

pkill -f server-jsondb

Start ulang:

node server-jsondb.js


---

❌ Frontend tidak connect backend

Pastikan API_BASE di index.html:

<script>window.API_BASE = "http://localhost:4001"</script>


---

❌ Login gagal (401)

Email/password salah

Admin belum dibuat → jalankan:


node setup-admin.js admin@rumahsakit.or.id admin12345


---

❌ Tidak bisa export CSV

Sudah FIX karena backend tidak memakai module csv-stringify lagi.
Jika error muncul lagi:

1. Hapus DB:



rm backend/data/db.json

2. Buat ulang admin




---

❌ Browser Android tidak bisa akses localhost

Gunakan alamat IP perangkat sendiri:

ip addr

Misal IP: 192.168.1.5

Frontend:

http://192.168.1.5:8080

Backend:

http://192.168.1.5:4001
