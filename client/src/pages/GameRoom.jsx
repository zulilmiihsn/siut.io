import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import CameraFeed from '../components/CameraFeed.jsx'
import { socket } from '../utils/socket.js'
import { Users, Timer, Trophy, CheckCircle2, Crown, XCircle, Hand } from 'lucide-react'

export default function GameRoom() {
  const { roomId } = useParams()
  const [players, setPlayers] = useState([])
  const [result, setResult] = useState(null)
  const [countdown, setCountdown] = useState(0)
  const [readyMap, setReadyMap] = useState({})
  const [isReady, setIsReady] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const [showResultModal, setShowResultModal] = useState(false)

  useEffect(() => {
    if (!roomId) return
    socket.emit('join-room', { roomId }, (resp) => {
      // no-op
    })

    const onUpdate = (payload) => {
      if (payload.roomId === roomId) setPlayers(payload.players)
    }
    const onRound = (payload) => {
      if (payload.roomId === roomId) {
        setResult(payload)
        setShowResultModal(true)
        // Auto hide modal after 3 seconds
        setTimeout(() => setShowResultModal(false), 3000)
      }
    }
    const onStart = (payload) => {
      if (payload.roomId === roomId) {
        setResult(null)
        setCountdown(0)
        setGameStarted(false)
        setShowResultModal(false)
      }
    }
    const onCountdown = (payload) => {
      if (payload.roomId === roomId) {
        setCountdown(payload.countdown)
        setGameStarted(false)
      }
    }
    const onGameStart = (payload) => {
      if (payload.roomId === roomId) {
        setCountdown(0)
        setGameStarted(true)
      }
    }
    const onReady = (payload) => {
      if (payload.roomId === roomId) setReadyMap(payload.ready || {})
    }
    socket.on('room-update', onUpdate)
    socket.on('round-result', onRound)
    socket.on('game-start', onStart)
    socket.on('round-start', onStart)
    socket.on('countdown-start', onCountdown)
    socket.on('game-start-countdown', onGameStart)
    socket.on('ready-update', onReady)

    return () => {
      socket.off('room-update', onUpdate)
      socket.off('round-result', onRound)
      socket.off('game-start', onStart)
      socket.off('round-start', onStart)
      socket.off('countdown-start', onCountdown)
      socket.off('game-start-countdown', onGameStart)
      socket.off('ready-update', onReady)
    }
  }, [roomId])

  // Countdown is now handled by server

  function toggleReady() {
    const next = !isReady
    setIsReady(next)
    socket.emit('set-ready', { roomId, ready: next })
  }

  // Check if all players are ready
  const canStartGame = players.length >= 2 && players.every(p => readyMap[p.id]) && !gameStarted && countdown === 0

  const winnerText = (() => {
    if (!result) return '—'
    if (result.result.type === 'draw') return 'Seri'
    return result.result.winner === socket.id ? 'Kamu Menang!' : 'Kamu Kalah'
  })()

  const getResultIcon = () => {
    if (!result) return null
    if (result.result.type === 'draw') return <Hand className="w-16 h-16 md:w-20 md:h-20 text-amber-400" />
    return result.result.winner === socket.id ? 
      <Crown className="w-16 h-16 md:w-20 md:h-20 text-green-400" /> : 
      <XCircle className="w-16 h-16 md:w-20 md:h-20 text-red-400" />
  }

  const getResultColor = () => {
    if (!result) return 'text-slate-300'
    if (result.result.type === 'draw') return 'text-amber-400'
    return result.result.winner === socket.id ? 'text-green-400' : 'text-red-400'
  }

  const getResultAnimation = () => {
    if (!result) return ''
    if (result.result.type === 'draw') return 'animate-pulse'
    return result.result.winner === socket.id ? 'animate-victory-pulse' : 'animate-defeat-shake'
  }

  return (
    <>
      {/* Result Modal Overlay - Competitive Style */}
      {showResultModal && result && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-md rounded-3xl p-6 md:p-10 text-center animate-pulse-scale border-2 shadow-2xl max-w-sm w-full ${
            result.result.type === 'draw' ? 'border-amber-500/50' : 
            result.result.winner === socket.id ? 'border-green-500/50' : 'border-red-500/50'
          }`}>
            <div className="flex flex-col items-center space-y-4 md:space-y-6">
              <div className={`${getResultAnimation()}`}>
                {getResultIcon()}
              </div>
              <h1 className={`text-3xl md:text-5xl font-black ${getResultColor()} ${getResultAnimation()} tracking-wide`}>
                {winnerText}
              </h1>
              {result.result.type !== 'draw' && (
                <div className="text-sm md:text-base text-slate-300 space-y-2">
                  <div className="flex justify-between items-center bg-slate-700/50 rounded-lg p-3">
                    <span>Gerakan kamu:</span>
                    <span className="font-bold text-green-400">{result.gestures[socket.id] || 'Tidak terdeteksi'}</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-700/50 rounded-lg p-3">
                    <span>Gerakan lawan:</span>
                    <span className="font-bold text-red-400">{Object.entries(result.gestures).find(([id]) => id !== socket.id)?.[1] || 'Tidak terdeteksi'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 fade-in">
        <section className="panel p-4 md:p-6 order-2 lg:order-1">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <h2 className="text-lg md:text-xl font-semibold">Room: {roomId}</h2>
            <span className="badge text-xs"><Users className="w-3 h-3 md:w-4 md:h-4"/> {players.length} pemain</span>
          </div>
          
          {/* Game Status Section - Competitive Style */}
          <div className="mb-6">
            {countdown > 0 && (
              <div className="text-center mb-4 p-6 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl border border-blue-500/30">
                <div className="text-7xl md:text-9xl font-black text-blue-400 animate-countdown-pulse drop-shadow-lg">
                  {countdown}
                </div>
                <p className="text-lg md:text-xl text-blue-200 mt-3 font-semibold">Siap-siap ya!</p>
                <div className="w-full bg-blue-500/20 rounded-full h-2 mt-4">
                  <div className="bg-gradient-to-r from-blue-400 to-purple-400 h-2 rounded-full animate-pulse" style={{width: `${(countdown/3)*100}%`}}></div>
                </div>
              </div>
            )}
            
            {gameStarted && (
              <div className="text-center mb-4 p-6 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl border border-green-500/30 animate-competitive-glow">
                <div className="text-5xl md:text-7xl font-black text-green-400 animate-pulse drop-shadow-lg">
                  BERMAIN!
                </div>
                <p className="text-lg md:text-xl text-green-200 mt-3 font-semibold">Tunjukin gerakan kamu!</p>
                <div className="flex justify-center mt-4">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse mr-2"></div>
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse mr-2" style={{animationDelay: '0.2s'}}></div>
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                </div>
              </div>
            )}
            
            {!countdown && !gameStarted && (
              <div className="text-center mb-4 p-6 bg-gradient-to-br from-slate-500/20 to-slate-600/20 rounded-2xl border border-slate-500/30">
                <div className="text-3xl md:text-5xl font-bold text-slate-300 flex items-center justify-center">
                  <Timer className="inline w-8 h-8 md:w-12 md:h-12 mr-3 text-slate-400" />
                  MENUNGGU
                </div>
                <p className="text-sm md:text-base text-slate-400 mt-2">Tunggu temen lain join</p>
              </div>
            )}
          </div>

          {/* Control Buttons - Competitive Style */}
          <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4 mb-6">
            {canStartGame && (
              <button 
                className="btn-primary text-sm md:text-base animate-competitive-glow font-bold" 
                onClick={() => socket.emit('start-game', { roomId })}
              >
                <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5"/> Gas Duel!
              </button>
            )}
            <button className={`btn-glass text-sm md:text-base transition-all duration-200 font-semibold ${isReady ? 'bg-green-500/20 border-green-500/50 animate-victory-pulse' : ''}`} onClick={toggleReady}>
              <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5"/> {isReady ? 'Siap ✓' : 'Siap'}
            </button>
          </div>

          {/* Last Result */}
          {result && !showResultModal && (
            <div className="mb-4 p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
              <p className="text-slate-200 flex items-center gap-2 text-sm md:text-base">
                <Trophy className="w-4 h-4 md:w-5 md:h-5 text-amber-400"/> 
                Hasil terakhir: <span className={`font-semibold ${getResultColor()}`}>{winnerText}</span>
              </p>
            </div>
          )}

          {/* Players Status - Competitive Style */}
          <div className="text-xs md:text-sm text-slate-300">
            <div className="mb-3 font-bold text-base md:text-lg flex items-center gap-2">
              <Users className="w-4 h-4 md:w-5 md:h-5 text-purple-400" />
              Status Pemain
            </div>
            <div className="space-y-3">
              {players.map((p) => (
                <div key={p.id} className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all duration-200 ${
                  readyMap[p.id] 
                    ? 'bg-green-500/10 border-green-500/30 animate-victory-pulse' 
                    : 'bg-red-500/10 border-red-500/30'
                }`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${readyMap[p.id] ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                    <span className="font-semibold">{p.id === socket.id ? 'Kamu' : p.id.slice(0,8)}</span>
                  </div>
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                    readyMap[p.id] 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>
                    {readyMap[p.id] ? 'Siap' : 'Belum siap'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        <section className="panel p-2 md:p-4 order-1 lg:order-2">
          <CameraFeed roomId={roomId} countdown={countdown} />
        </section>
      </div>
    </>
  )
}


