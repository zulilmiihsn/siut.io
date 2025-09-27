import RoomControls from '../components/RoomControls.jsx'
import { Sparkles, Users, Hand, Rocket } from 'lucide-react'

export default function Home() {
  return (
    <div className="grid gap-6 md:gap-8">
      <section className="relative overflow-hidden panel p-4 md:p-6 lg:p-8 fade-in">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,#38bdf8,transparent_40%),radial-gradient(circle_at_80%_30%,#a78bfa,transparent_40%)]" />
        <div className="relative grid lg:grid-cols-2 gap-4 md:gap-6 items-center">
          <div className="text-center lg:text-left">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black mb-2 md:mb-3 game-title neon">siut.io</h1>
            <p className="text-slate-300 mb-4 md:mb-6 text-sm md:text-base font-semibold">Main suit pakai tangan aja! Bikin room, ajak temen, langsung duel! 🎮</p>
            <div className="flex flex-col sm:flex-row gap-2 md:gap-3 justify-center lg:justify-start">
              <a href="#play" className="btn-primary text-sm md:text-base animate-competitive-glow"><Rocket className="w-4 h-4 md:w-5 md:h-5" /> Gas Main!</a>
              <a href="#fitur" className="btn-glass text-sm md:text-base"><Sparkles className="w-4 h-4" /> Cek Fitur</a>
            </div>
          </div>
          <div className="justify-self-center lg:justify-self-end lg:mr-4">
            <div className="card w-full max-w-sm md:max-w-md lg:w-96 aspect-video overflow-hidden flex items-center justify-center bg-slate-800/20 group cursor-pointer">
              <div className="relative w-full h-full flex items-center justify-center">
                <img 
                  src="/hero.png" 
                  alt="hero" 
                  className="max-w-full max-h-full object-contain transition-all duration-500 ease-out group-hover:scale-110 group-active:scale-110 transform-gpu" 
                  onError={(e) => { e.currentTarget.style.display = 'none' }} 
                />
                {/* Magical glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-blue-500/20 group-hover:via-purple-500/30 group-hover:to-pink-500/20 transition-all duration-500 ease-out rounded-lg"></div>
                {/* Sparkle effects */}
                <div className="absolute top-2 right-2 w-2 h-2 bg-yellow-400 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-opacity duration-300"></div>
                <div className="absolute bottom-3 left-3 w-1.5 h-1.5 bg-cyan-400 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-opacity duration-300 delay-100"></div>
                <div className="absolute top-1/2 left-1 w-1 h-1 bg-pink-400 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-opacity duration-300 delay-200"></div>
                {/* Magical border glow */}
                <div className="absolute inset-0 border-2 border-transparent group-hover:border-purple-400/50 group-hover:shadow-lg group-hover:shadow-purple-500/25 transition-all duration-500 ease-out rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="fitur" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 fade-in">
        <div className="card p-4 md:p-6">
          <div className="flex items-center gap-2 mb-2"><Hand className="w-4 h-4 md:w-5 md:h-5 text-green-400" /><h3 className="font-bold text-sm md:text-base">Deteksi Tangan</h3></div>
          <p className="text-slate-300 text-xs md:text-sm font-medium">Kamera langsung deteksi gerakan tangan kamu, gak ada yang bisa curang!</p>
        </div>
        <div className="card p-4 md:p-6">
          <div className="flex items-center gap-2 mb-2"><Users className="w-4 h-4 md:w-5 md:h-5 text-purple-400" /><h3 className="font-bold text-sm md:text-base">Main Bareng</h3></div>
          <p className="text-slate-300 text-xs md:text-sm font-medium">Bikin room baru atau join room temen, langsung main aja!</p>
        </div>
        <div className="card p-4 md:p-6 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 mb-2"><Sparkles className="w-4 h-4 md:w-5 md:h-5 text-amber-400" /><h3 className="font-bold text-sm md:text-base">Keren Abis</h3></div>
          <p className="text-slate-300 text-xs md:text-sm font-medium">Tampilan gaming yang keren dengan efek neon dan animasi yang seru!</p>
        </div>
      </section>

      <section id="play" className="card">
        <RoomControls />
      </section>
    </div>
  )
}


