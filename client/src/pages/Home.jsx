import RoomControls from '../components/RoomControls.jsx'
import { Sparkles, Users, Hand, Rocket } from 'lucide-react'

export default function Home() {
  return (
    <div className="grid gap-6 md:gap-8">
      <section className="relative overflow-hidden panel p-4 md:p-6 lg:p-8 fade-in">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,#38bdf8,transparent_40%),radial-gradient(circle_at_80%_30%,#a78bfa,transparent_40%)]" />
        <div className="relative grid lg:grid-cols-2 gap-4 md:gap-6 items-center">
          <div className="text-center lg:text-left">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold mb-2 md:mb-3 game-title neon">siut.io</h1>
            <p className="text-slate-300 mb-4 md:mb-6 text-sm md:text-base">Game suit berbasis gesture tangan. Buat room, ajak teman, dan bertarung cepat!</p>
            <div className="flex flex-col sm:flex-row gap-2 md:gap-3 justify-center lg:justify-start">
              <a href="#play" className="btn-primary text-sm md:text-base"><Rocket className="w-4 h-4 md:w-5 md:h-5" /> Main Sekarang</a>
              <a href="#fitur" className="btn-glass text-sm md:text-base"><Sparkles className="w-4 h-4" /> Lihat Fitur</a>
            </div>
          </div>
          <div className="justify-self-center lg:justify-self-end">
            <div className="card w-full max-w-sm md:max-w-md lg:w-96 aspect-video overflow-hidden flex items-center justify-center text-slate-300">
              <img src="/hero.png" alt="hero" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
              <span className="text-xs md:text-sm">Letakkan gambar hero di /public/hero.png</span>
            </div>
          </div>
        </div>
      </section>

      <section id="fitur" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 fade-in">
        <div className="card p-4 md:p-6">
          <div className="flex items-center gap-2 mb-2"><Hand className="w-4 h-4 md:w-5 md:h-5 text-sky-400" /><h3 className="font-semibold text-sm md:text-base">Gesture Tracking</h3></div>
          <p className="text-slate-300 text-xs md:text-sm">Deteksi tangan real-time dengan MediaPipe untuk suit yang adil.</p>
        </div>
        <div className="card p-4 md:p-6">
          <div className="flex items-center gap-2 mb-2"><Users className="w-4 h-4 md:w-5 md:h-5 text-sky-400" /><h3 className="font-semibold text-sm md:text-base">Multiplayer Cepat</h3></div>
          <p className="text-slate-300 text-xs md:text-sm">Buat room baru atau pilih room yang tersedia, langsung main.</p>
        </div>
        <div className="card p-4 md:p-6 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 mb-2"><Sparkles className="w-4 h-4 md:w-5 md:h-5 text-sky-400" /><h3 className="font-semibold text-sm md:text-base">UI Bergaya</h3></div>
          <p className="text-slate-300 text-xs md:text-sm">Tema neon, kaca, dan animasi ringan untuk nuansa arcade.</p>
        </div>
      </section>

      <section id="play" className="card">
        <RoomControls />
      </section>
    </div>
  )
}


