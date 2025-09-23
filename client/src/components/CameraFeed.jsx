import { useCallback, useEffect, useRef, useState } from 'react'
import { Hands } from '@mediapipe/hands'
import { Camera } from '@mediapipe/camera_utils'
import { socket } from '../utils/socket.js'
import { predictGestureFromLandmarks } from '../utils/model.js'

export default function CameraFeed({ roomId, countdown }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [permission, setPermission] = useState('pending')
  const cameraRef = useRef(null)
  const submittedRef = useRef(false)
  const targetFpsRef = useRef(30) // Target FPS default
  const lastFrameTsRef = useRef(0)
  const lastPreviewTsRef = useRef(0)
  const frameSkipRef = useRef(0)
  const [previewGesture, setPreviewGesture] = useState(null) // Keep for UI feedback
  const stableLabelRef = useRef(null)
  const stableCountRef = useRef(0)

  const onResults = useCallback((results) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !videoRef.current) return
    
    // Set canvas size to match video (only if changed)
    const videoWidth = videoRef.current.videoWidth || 640
    const videoHeight = videoRef.current.videoHeight || 480
    if (canvas.width !== videoWidth || canvas.height !== videoHeight) {
      canvas.width = videoWidth
      canvas.height = videoHeight
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height)

    if (results.multiHandLandmarks) {
      ctx.fillStyle = '#22d3ee'
      ctx.beginPath()
      results.multiHandLandmarks.forEach((landmarks) => {
        landmarks.forEach((lm) => {
          ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 4, 0, 2 * Math.PI)
        })
      })
      ctx.fill()
    }

            // Optimized live preview prediction with frame skipping
            if (results.multiHandLandmarks?.length > 0) {
              const now = performance.now()
              
              // Skip frames for better performance
              frameSkipRef.current++
              if (frameSkipRef.current % 2 !== 0) return // Skip every other frame
              
              if (now - lastPreviewTsRef.current > 300) { // Increased interval
                lastPreviewTsRef.current = now
                ;(async () => {
                  // Coba deteksi dengan tangan pertama yang terdeteksi
                  const handLandmarks = results.multiHandLandmarks[0]
                  if (handLandmarks && handLandmarks.length > 0) {
                    const pred = await predictGestureFromLandmarks([handLandmarks], canvas.width, canvas.height)
                    
                    if (pred?.confidence >= 0.4 && pred?.label) { // Turunkan threshold untuk deteksi lebih sensitif
                      // Smoothing: butuh 2 deteksi berurutan sama
                      if (stableLabelRef.current === pred.label) {
                        stableCountRef.current += 1
                      } else {
                        stableLabelRef.current = pred.label
                        stableCountRef.current = 1
                      }
                      if (stableCountRef.current >= 2) {
                      setPreviewGesture(pred.label)
                      }
                    } else {
                      setPreviewGesture(null)
                      stableLabelRef.current = null
                      stableCountRef.current = 0
                    }
                  } else {
                    setPreviewGesture(null)
                    stableLabelRef.current = null
                    stableCountRef.current = 0
                  }
                })()
              }
            } else {
              setPreviewGesture(null)
              stableLabelRef.current = null
              stableCountRef.current = 0
            }

    // Emoji overlay removed for better performance

           // When countdown reaches 0, submit a gesture (predicted)
           if (countdown === 0 && roomId && !submittedRef.current) {
             submittedRef.current = true
             ;(async () => {
               // Coba deteksi dengan tangan pertama yang terdeteksi
               const handLandmarks = results.multiHandLandmarks?.[0]
               if (handLandmarks && handLandmarks.length > 0) {
                 const pred = await predictGestureFromLandmarks([handLandmarks], canvas.width, canvas.height)
                 
                 if (pred?.label) {
                   socket.emit('submit-gesture', { roomId, gesture: pred.label })
                 } else {
                   submittedRef.current = false
                 }
               } else {
                 submittedRef.current = false
               }
             })()
    }
  }, [countdown, roomId])

  useEffect(() => {
    let isInitialized = false
    
    async function init() {
      if (isInitialized) return
      isInitialized = true
      
      try {
        // Initializing camera and MediaPipe
        
        // Cek apakah getUserMedia tersedia
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          console.error('[siut.io] getUserMedia not supported')
          setPermission('denied')
          return
        }

        // Coba dengan berbagai constraint
        let stream = null
        const constraints = [
          { video: { width: 640, height: 480, facingMode: 'user' } },
          { video: { width: 640, height: 480 } },
          { video: true },
          { video: { facingMode: 'user' } }
        ]

        for (const constraint of constraints) {
          try {
            stream = await navigator.mediaDevices.getUserMedia(constraint)
            break
          } catch (err) {
            continue
          }
        }

        if (!stream) {
          console.error('[siut.io] All camera constraints failed')
          setPermission('denied')
          return
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          // Wait for video to be ready
          await new Promise((resolve) => {
            if (videoRef.current.readyState >= 3) {
              resolve()
            } else {
              videoRef.current.onloadedmetadata = resolve
            }
          })
          await videoRef.current.play()
          
          // Wait a bit more for video to be fully ready
          await new Promise(resolve => setTimeout(resolve, 500))
        }
        setPermission('granted')

        // Setting up MediaPipe Hands
        
        // Coba beberapa CDN untuk MediaPipe
        const cdnUrls = [
          'https://cdn.jsdelivr.net/npm/@mediapipe/hands/',
          'https://unpkg.com/@mediapipe/hands@0.4.1646424915/',
          'https://cdn.skypack.dev/@mediapipe/hands@0.4.1646424915/'
        ]
        
        let hands = null
        let handsError = null
        
        for (const cdnUrl of cdnUrls) {
          try {
            // Trying MediaPipe CDN
            hands = new Hands({ 
              locateFile: (file) => `${cdnUrl}${file}`,
              onError: (error) => {
                console.warn('[siut.io] MediaPipe error:', error)
                handsError = error
              }
            })
            break
          } catch (e) {
            console.warn('[siut.io] Failed to load MediaPipe from:', cdnUrl, e)
            handsError = e
            continue
          }
        }
        
        if (!hands) {
          console.error('[siut.io] Failed to load MediaPipe from all CDNs:', handsError)
          // Fallback: buat hands object kosong untuk mencegah crash
          hands = {
            setOptions: () => {},
            onResults: () => {},
            send: () => Promise.resolve(),
            close: () => {}
          }
          console.warn('MediaPipe tidak bisa dimuat, gesture detection dinonaktifkan')
        }
        
        hands.setOptions({
          selfieMode: true,
          maxNumHands: 1, // Lebih stabil untuk 1 pemain
          modelComplexity: 1, // Akurasi lebih baik
          minDetectionConfidence: 0.6, // Sedikit dinaikkan untuk kualitas
          minTrackingConfidence: 0.6,  // Sedikit dinaikkan untuk stabilitas
        })
        hands.onResults(onResults)


        cameraRef.current = new Camera(videoRef.current, {
          onFrame: async () => {
            try {
              const now = performance.now()
              const minInterval = 1000 / targetFpsRef.current
              if (now - lastFrameTsRef.current < minInterval) return
              lastFrameTsRef.current = now
              
              
              // Cek apakah video masih aktif dan hands tersedia
              if (videoRef.current && videoRef.current.readyState >= 2 && hands && hands.send) {
                try {
                  await hands.send({ image: videoRef.current })
                } catch (e) {
                  console.warn('[siut.io] Hands processing error:', e)
                  // Jika hands error, coba restart
                  if (e.message?.includes('MediaPipe') || e.message?.includes('wasm')) {
                    console.warn('MediaPipe error, coba refresh halaman')
                  }
                }
              }
            } catch (e) {
              console.warn('[siut.io] Frame processing error:', e)
            }
          },
          width: window.innerWidth < 420 ? 320 : 480, // Reduced resolution
          height: window.innerWidth < 420 ? 240 : 360
        })
        
        
        cameraRef.current.start()
      } catch (e) {
        console.error('[siut.io] Camera initialization error:', e)
        setPermission('denied')
        isInitialized = false
      }
    }
    init()
    return () => {
      isInitialized = false
      try {
        // Stop camera and cleanup
        cameraRef.current?.stop()
        const tracks = videoRef.current?.srcObject?.getTracks?.() || []
        tracks.forEach((t) => t.stop())
        
        // Cleanup MediaPipe hands
        if (hands && hands.close) {
          hands.close()
        }
        
        // Clear video source
        if (videoRef.current) {
          videoRef.current.srcObject = null
        }
        
        
        // Clear canvas
        const canvas = canvasRef.current
        if (canvas) {
          const ctx = canvas.getContext('2d')
          ctx?.clearRect(0, 0, canvas.width, canvas.height)
        }
      } catch {}
    }
  }, [onResults])

  // Reset submitted flag when countdown resets (non-zero)
  useEffect(() => {
    if (countdown > 0) {
      submittedRef.current = false
    }
  }, [countdown])

  // Optimized FPS management based on visibility and device
  useEffect(() => {
    function updateFps() {
      const isMobile = /Mobi|Android/i.test(navigator.userAgent)
      const hidden = document.hidden
      const isLowEnd = navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4
      
      // Adaptive FPS based on device capabilities
      if (hidden) {
        targetFpsRef.current = 1
      } else if (isMobile || isLowEnd) {
        targetFpsRef.current = 20
      } else {
        targetFpsRef.current = 30
      }
    }
    updateFps()
    
    const visHandler = () => {
      updateFps()
      // Pause/resume camera saat tab tidak aktif
      if (document.hidden) {
        cameraRef.current?.stop()
      } else if (permission === 'granted') {
        cameraRef.current?.start()
      }
    }
    
    document.addEventListener('visibilitychange', visHandler)
    window.addEventListener('resize', updateFps)
    
    return () => {
      document.removeEventListener('visibilitychange', visHandler)
      window.removeEventListener('resize', updateFps)
    }
  }, [permission])


  const iconForGesture = (label) => {
    if (!label) return '✋'
    const map = {
      rock: '✊',
      paper: '✋',
      scissors: '✌️'
    }
    return map[label] || '✋'
  }

  return (
      <div className="relative w-full">
      {/* Processing elements */}
      <video ref={videoRef} className="hidden" muted playsInline></video>
      {/* Preview canvas (visible) */}
      <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full"></canvas>
        {/* Gesture overlay */}
        <div className="absolute top-3 left-3 bg-black/40 text-white rounded-lg px-3 py-1 select-none">
          <span className="text-3xl md:text-4xl leading-none">
            {iconForGesture(previewGesture)}
          </span>
                 </div>
      </div>
    </div>
  )
}



