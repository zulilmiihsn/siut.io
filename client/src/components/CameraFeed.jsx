import { useCallback, useEffect, useRef, useState } from 'react'
import { Hands } from '@mediapipe/hands'
import { Camera } from '@mediapipe/camera_utils'
import { socket } from '../utils/socket.js'
import { getDummyGesture } from '../utils/model.js'

export default function CameraFeed({ roomId, countdown }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [permission, setPermission] = useState('pending')
  const cameraRef = useRef(null)

  const onResults = useCallback((results) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !videoRef.current) return
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height)

    if (results.multiHandLandmarks) {
      ctx.fillStyle = '#22d3ee'
      results.multiHandLandmarks.forEach((landmarks) => {
        landmarks.forEach((lm) => {
          ctx.beginPath()
          ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 4, 0, 2 * Math.PI)
          ctx.fill()
        })
      })
    }

    // When countdown reaches 0, submit a gesture (dummy for now)
    if (countdown === 0 && roomId) {
      const gesture = getDummyGesture()
      socket.emit('submit-gesture', { roomId, gesture })
    }
  }, [countdown, roomId])

  useEffect(() => {
    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        setPermission('granted')

        const hands = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` })
        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.7,
        })
        hands.onResults(onResults)

        cameraRef.current = new Camera(videoRef.current, {
          onFrame: async () => {
            await hands.send({ image: videoRef.current })
          },
          width: 640,
          height: 480
        })
        cameraRef.current.start()
      } catch (e) {
        setPermission('denied')
      }
    }
    init()
    return () => {
      try {
        cameraRef.current?.stop()
        const tracks = videoRef.current?.srcObject?.getTracks?.() || []
        tracks.forEach((t) => t.stop())
      } catch {}
    }
  }, [onResults])

  return (
    <div className="grid gap-3">
      <div className="relative w-full">
        <video ref={videoRef} className="w-full rounded-lg hidden" muted playsInline></video>
        <canvas ref={canvasRef} className="w-full rounded-lg"></canvas>
      </div>
      <div className="text-sm text-slate-300">Kamera: {permission}</div>
    </div>
  )
}


