# Deploy Guide - Render Fullstack

## Backend (Web Service)

1. Buka `render.com` → "New +" → "Web Service"
2. Connect GitHub repo `zulilmiihsn/siut.io`
3. Konfigurasi:
   - **Name**: `siut-io-backend`
   - **Environment**: `Node`
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`
   - **Plan**: `Free`
4. Deploy dan copy URL (contoh: `https://siut-io-backend.onrender.com`)

## Frontend (Static Site)

1. Render → "New +" → "Static Site"
2. Connect GitHub repo `zulilmiihsn/siut.io`
3. Konfigurasi:
   - **Name**: `siut-io-frontend`
   - **Build Command**: `cd client && npm install && npm run build`
   - **Publish Directory**: `client/dist`
   - **Plan**: `Free`
4. Environment Variables:
   - `VITE_SERVER_URL` = URL backend dari step 1
5. Deploy

## Hasil

- Backend: `https://siut-io-backend.onrender.com`
- Frontend: `https://siut-io-frontend.onrender.com`

Frontend akan otomatis connect ke backend via environment variable.
