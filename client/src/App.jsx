import { Routes, Route, Link } from 'react-router-dom'
import { useEffect } from 'react'
import { Gamepad2, Home as HomeIcon } from 'lucide-react'
import Home from './pages/Home.jsx'
import GameRoom from './pages/GameRoom.jsx'

export default function App() {
  useEffect(() => {
    document.title = 'siut.io'
  }, [])
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 bg-slate-900/70 backdrop-blur border-b border-white/10">
        <div className="container-site py-2 md:py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-lg md:text-xl font-semibold">
          <Gamepad2 className="w-5 h-5 md:w-6 md:h-6 text-sky-400" />
          <span className="game-title neon">siut.io</span>
        </Link>
        <nav className="space-x-1 md:space-x-2 text-xs md:text-sm">
          <Link to="/" className="btn-glass text-xs md:text-sm"><HomeIcon className="w-3 h-3 md:w-4 md:h-4" /> <span className="hidden sm:inline">Home</span></Link>
        </nav>
        </div>
      </header>
      <main className="container-site py-4 md:py-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/room/:roomId" element={<GameRoom />} />
        </Routes>
        <footer className="pt-8 pb-10 text-center text-xs subtle">© {new Date().getFullYear()} siut.io</footer>
      </main>
    </div>
  )
}


