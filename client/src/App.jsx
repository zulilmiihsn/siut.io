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
      <header className="p-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-xl font-semibold">
          <Gamepad2 className="w-6 h-6 text-sky-400" />
          <span className="game-title neon">siut.io</span>
        </Link>
        <nav className="space-x-2 text-sm">
          <Link to="/" className="btn-glass"><HomeIcon className="w-4 h-4" /> Home</Link>
        </nav>
      </header>
      <main className="max-w-6xl mx-auto p-4">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/room/:roomId" element={<GameRoom />} />
        </Routes>
      </main>
    </div>
  )
}


