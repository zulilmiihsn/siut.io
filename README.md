# siut.io

Skeleton fullstack siut.io: React (Vite) + TailwindCSS, Express + Socket.io, MediaPipe Hands, dan placeholder TensorFlow.js.

## Struktur Folder

```
/client
  /public
    /model    # taruh model.json + weights di sini nanti
  /src
    /components
      CameraFeed.jsx
      RoomControls.jsx
    /pages
      Home.jsx
      GameRoom.jsx
    /utils
      socket.js
      model.js
    App.jsx
    main.jsx
  index.html
  tailwind.config.js
  postcss.config.js
  vite.config.js
/server
  server.js
  specification.md
```

## Menjalankan

- Server
  ```bash
  cd server
  npm install
  npm start
  ```
  Berjalan di `http://localhost:5000`.

- Client
  ```bash
  cd client
  npm install
  npm run dev
  ```
  Buka `http://localhost:5173`.

## Konfigurasi
- Client konek ke `http://localhost:5000`. Ubah dengan file `.env` di `client/`:
  ```
  VITE_SERVER_URL=http://your-server:5000
  ```

## HTTPS (disarankan untuk akses kamera)

### Server (Express + Socket.io)
- Dukungan HTTPS via environment variables.
- Variabel:
  - `HTTPS=true` atau `1` untuk mengaktifkan
  - `SSL_KEY_PATH` path ke file key (PEM)
  - `SSL_CERT_PATH` path ke file cert (PEM)
  - (opsional) `SSL_CA_PATH` chain/CA file
- Contoh (Windows PowerShell):
  ```powershell
  setx HTTPS "true"
  setx SSL_KEY_PATH "D:\\certs\\localhost-key.pem"
  setx SSL_CERT_PATH "D:\\certs\\localhost.pem"
  ```
- Jalankan server kembali. Log akan menampilkan protokol `https://` bila aktif.

Tips dev: buat self-signed cert (OpenSSL)
```bash
openssl req -x509 -newkey rsa:2048 -nodes -keyout localhost-key.pem -out localhost.pem -days 365 -subj "/CN=localhost"
```

### Client (Vite)
- Vite dev server mendukung HTTPS via `.env`:
  - `HTTPS=true`
  - (opsional) `SSL_KEY_PATH`, `SSL_CERT_PATH` (kalau tidak ada, Vite pakai self-signed bawaan)
- Contoh `.env`:
  ```
  HTTPS=true
  # SSL_KEY_PATH=./certs/localhost-key.pem
  # SSL_CERT_PATH=./certs/localhost.pem
  VITE_SERVER_URL=https://localhost:5000
  ```
- Jalankan dev server dan akses `https://localhost:5173`.

Catatan: Browser bisa menandai sertifikat self-signed sebagai tidak tepercaya; tambahkan ke Keychain/Trusted Root atau bypass untuk keperluan pengembangan.

## Model
- Taruh `model.json` dan file bobot (`*.bin`) pada `client/public/model/`.
- `loadModel()` di `src/utils/model.js` akan memuat dari `/model/model.json` bila tersedia; jika tidak, app memakai dummy classifier acak.

## Fitur Skeleton
- Webcam + deteksi landmark tangan via MediaPipe dan render ke canvas.
- Socket.io: create/join room, submit gesture, hasil ronde broadcast oleh server.
- UI minimal modern dengan Tailwind.

Lisensi: MIT
