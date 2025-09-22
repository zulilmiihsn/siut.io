import RoomControls from '../components/RoomControls.jsx'
import { Sparkles, Users, Hand, Rocket } from 'lucide-react'

export default function Home() {
  return (
    <div className="grid gap-8">
      <section className="relative overflow-hidden panel p-8">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,#38bdf8,transparent_40%),radial-gradient(circle_at_80%_30%,#a78bfa,transparent_40%)]" />
        <div className="relative grid md:grid-cols-2 gap-6 items-center">
          <div>
            <h1 className="text-3xl md:text-5xl font-extrabold mb-3 game-title neon">siut.io</h1>
            <p className="text-slate-300 mb-6">Game suit berbasis gesture tangan. Buat room, ajak teman, dan bertarung cepat!</p>
            <div className="flex gap-3">
              <a href="#play" className="btn-primary"><Rocket className="w-5 h-5" /> Main Sekarang</a>
              <a href="#fitur" className="btn-glass"><Sparkles className="w-4 h-4" /> Lihat Fitur</a>
            </div>
          </div>
          <div className="justify-self-end">
            <div className="card w-full md:w-96 aspect-video flex items-center justify-center text-slate-300">
              <span className="text-sm">Letakkan gambar hero di /public/hero.png</span>
            </div>
          </div>
        </div>
      </section>

      <section id="fitur" className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center gap-2 mb-2"><Hand className="w-5 h-5 text-sky-400" /><h3 className="font-semibold">Gesture Tracking</h3></div>
          <p className="text-slate-300 text-sm">Deteksi tangan real-time dengan MediaPipe untuk suit yang adil.</p>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-2"><Users className="w-5 h-5 text-sky-400" /><h3 className="font-semibold">Multiplayer Cepat</h3></div>
          <p className="text-slate-300 text-sm">Buat atau gabung room dengan kode unik, langsung main.</p>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-2"><Sparkles className="w-5 h-5 text-sky-400" /><h3 className="font-semibold">UI Bergaya</h3></div>
          <p className="text-slate-300 text-sm">Tema neon, kaca, dan animasi ringan untuk nuansa arcade.</p>
        </div>
      </section>

      <section id="play" className="card">
        <RoomControls />
      </section>
    </div>
  )
}


