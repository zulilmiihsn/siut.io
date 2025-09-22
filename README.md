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

## Model
- Taruh `model.json` dan file bobot (`*.bin`) pada `client/public/model/`.
- `loadModel()` di `src/utils/model.js` akan memuat dari `/model/model.json` bila tersedia; jika tidak, app memakai dummy classifier acak.

## Fitur Skeleton
- Webcam + deteksi landmark tangan via MediaPipe dan render ke canvas.
- Socket.io: create/join room, submit gesture, hasil ronde broadcast oleh server.
- UI minimal modern dengan Tailwind.

Lisensi: MIT
