import { useCallback, useEffect, useRef, useState } from 'react'
import { Hands } from '@mediapipe/hands'
import { Camera } from '@mediapipe/camera_utils'
import { socket } from '../utils/socket.js'
import { predictGestureFromLandmarks, loadModel } from '../utils/model.js'

export default function CameraFeed({ roomId, countdown }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [permission, setPermission] = useState('pending')
  const cameraRef = useRef(null)
  const submittedRef = useRef(false)
  const targetFpsRef = useRef(20) // Start with lower FPS
  const lastFrameTsRef = useRef(0)
  const lastPreviewTsRef = useRef(0)
  const frameSkipRef = useRef(0)
  const performanceMonitorRef = useRef({ frameCount: 0, lastCheck: 0 })
  const [previewGesture, setPreviewGesture] = useState(null) // Keep for UI feedback
  const [errorMessage, setErrorMessage] = useState(null)
  const [cameraStatus, setCameraStatus] = useState('active')
  const [handOrientation, setHandOrientation] = useState(null) // Track hand orientation

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
      
      // Detect hand orientation for better guidance
      if (results.multiHandLandmarks.length > 0) {
        const hand = results.multiHandLandmarks[0]
        if (hand && hand.length >= 21) {
          // Calculate hand orientation based on palm center and wrist
          const palmCenter = hand[9] // Middle finger MCP
          const wrist = hand[0] // Wrist
          const thumbBase = hand[1] // Thumb CMC
          
          // Calculate orientation vector
          const palmToWrist = {
            x: palmCenter.x - wrist.x,
            y: palmCenter.y - wrist.y
          }
          
          // Determine orientation
          const angle = Math.atan2(palmToWrist.y, palmToWrist.x) * 180 / Math.PI
          let orientation = 'facing_camera'
          
          if (angle > 45 && angle < 135) {
            orientation = 'facing_right'
          } else if (angle > -135 && angle < -45) {
            orientation = 'facing_left'
          } else if (angle > 135 || angle < -135) {
            orientation = 'facing_up'
          } else if (angle > -45 && angle < 45) {
            orientation = 'facing_down'
          }
          
          setHandOrientation(orientation)
        }
      }
    } else {
      setHandOrientation(null)
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
                    
                    if (pred?.error) {
                      setPreviewGesture(null)
                      setErrorMessage(pred.error)
                    } else if (pred?.confidence >= 0.4) { // Turunkan threshold untuk deteksi lebih sensitif
                      setPreviewGesture(pred.label)
                      setErrorMessage(null)
                    } else {
                      setPreviewGesture(null)
                      setErrorMessage(null)
                    }
                  } else {
                    setPreviewGesture(null)
                    setErrorMessage(null)
                  }
                })()
              }
            } else {
              setPreviewGesture(null)
              setErrorMessage(null)
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
                 
                 if (pred?.error) {
                   setErrorMessage(pred.error)
                   submittedRef.current = false
                 } else if (pred?.label) {
                   socket.emit('submit-gesture', { roomId, gesture: pred.label })
                 } else {
                   setErrorMessage("Tidak ada gesture yang terdeteksi")
                   submittedRef.current = false
                 }
               } else {
                 setErrorMessage("Tidak ada tangan yang terdeteksi")
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
        setCameraStatus('active')

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
          setErrorMessage('MediaPipe tidak bisa dimuat, gesture detection dinonaktifkan')
        }
        
        hands.setOptions({
          maxNumHands: 2, // Deteksi hingga 2 tangan untuk orientasi berbeda
          modelComplexity: 1, // Naikkan complexity untuk deteksi yang lebih baik
          minDetectionConfidence: 0.5, // Turunkan threshold untuk deteksi lebih sensitif
          minTrackingConfidence: 0.5,  // Turunkan threshold untuk tracking lebih stabil
        })
        hands.onResults(onResults)

        // Pre-load the TensorFlow model
        try {
          await loadModel()
        } catch (e) {
          console.error('[siut.io] Failed to pre-load TensorFlow model:', e)
        }

        cameraRef.current = new Camera(videoRef.current, {
          onFrame: async () => {
            try {
              const now = performance.now()
              const minInterval = 1000 / targetFpsRef.current
              if (now - lastFrameTsRef.current < minInterval) return
              lastFrameTsRef.current = now
              
              // Performance monitoring
              performanceMonitorRef.current.frameCount++
              if (now - performanceMonitorRef.current.lastCheck > 5000) { // Check every 5 seconds
                const fps = performanceMonitorRef.current.frameCount / 5
                
                // Auto-adjust FPS based on performance
                if (fps < targetFpsRef.current * 0.8) {
                  targetFpsRef.current = Math.max(10, targetFpsRef.current - 2)
                } else if (fps > targetFpsRef.current * 1.2) {
                  targetFpsRef.current = Math.min(30, targetFpsRef.current + 2)
                }
                
                performanceMonitorRef.current = { frameCount: 0, lastCheck: now }
              }
              
              // Cek apakah video masih aktif dan hands tersedia
              if (videoRef.current && videoRef.current.readyState >= 2 && hands && hands.send) {
                try {
            await hands.send({ image: videoRef.current })
                } catch (e) {
                  console.warn('[siut.io] Hands processing error:', e)
                  // Jika hands error, coba restart
                  if (e.message?.includes('MediaPipe') || e.message?.includes('wasm')) {
                    setErrorMessage('MediaPipe error, coba refresh halaman')
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
        
        // Tambahkan error handling untuk camera
        cameraRef.current.onError = (error) => {
          console.error('[siut.io] Camera error:', error)
          setPermission('denied')
        }
        
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
        
        // Reset performance monitoring
        performanceMonitorRef.current = { frameCount: 0, lastCheck: 0 }
        frameSkipRef.current = 0
        
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
      setErrorMessage(null)
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
        targetFpsRef.current = 12
      } else {
        targetFpsRef.current = 18
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

  // Monitor camera status
  useEffect(() => {
    if (permission !== 'granted') return

    const checkCameraStatus = () => {
      if (videoRef.current) {
        const video = videoRef.current
        const isPlaying = !video.paused && !video.ended && video.readyState >= 2
        const hasVideo = video.videoWidth > 0 && video.videoHeight > 0
        
        // Camera status check optimized
        
        if (!isPlaying || !hasVideo) {
          console.warn('[siut.io] Camera appears to be inactive')
          setCameraStatus('inactive')
          setErrorMessage('Kamera tidak aktif, coba refresh halaman')
        } else {
          setCameraStatus('active')
          setErrorMessage(null)
        }
      }
    }

    // Initial check after a delay to let camera initialize
    const initialCheck = setTimeout(checkCameraStatus, 1000)
    const interval = setInterval(checkCameraStatus, 3000) // Check every 3 seconds
    
    return () => {
      clearTimeout(initialCheck)
      clearInterval(interval)
    }
  }, [permission])

  const retryCamera = async () => {
    setPermission('pending')
    setCameraStatus('restarting')
    setErrorMessage(null)
    
    try {
      // Stop existing camera and stream
      if (cameraRef.current) {
        cameraRef.current.stop()
      }
      const tracks = videoRef.current?.srcObject?.getTracks?.() || []
      tracks.forEach((t) => t.stop())
      
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Try again with different constraints
      const constraints = [
        { video: { width: 640, height: 480, facingMode: 'user' } },
        { video: { width: 640, height: 480 } },
        { video: true }
      ]

      let stream = null
      for (const constraint of constraints) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraint)
          break
        } catch (err) {
          // Constraint failed
          continue
        }
      }

      if (!stream) {
        throw new Error('All camera constraints failed')
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await new Promise((resolve) => {
          if (videoRef.current.readyState >= 3) {
            resolve()
          } else {
            videoRef.current.onloadedmetadata = resolve
          }
        })
        await videoRef.current.play()
      }
      
      setPermission('granted')
      setCameraStatus('active')
    } catch (e) {
      console.error('[siut.io] Camera retry failed:', e)
      setPermission('denied')
      setCameraStatus('inactive')
      setErrorMessage('Gagal memulai kamera: ' + e.message)
    }
  }

  return (
           <div className="grid gap-2 md:gap-3">
      <div className="relative w-full">
        <video ref={videoRef} className="w-full rounded-lg hidden" muted playsInline></video>
               <canvas ref={canvasRef} className="w-full rounded-lg" style={{ display: permission === 'granted' && cameraStatus === 'active' ? 'block' : 'none' }}></canvas>
               {permission !== 'granted' && (
                 <div className="w-full h-48 md:h-64 bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 text-sm md:text-base">
                   {permission === 'pending' ? 'Memuat kamera...' : 'Kamera tidak tersedia'}
                 </div>
               )}
               {permission === 'granted' && cameraStatus !== 'active' && (
                 <div className="w-full h-48 md:h-64 bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 text-sm md:text-base">
                   Kamera tidak aktif - {cameraStatus}
                 </div>
               )}
             </div>
             <div className="text-xs md:text-sm text-slate-300">
               <div className="flex flex-wrap gap-2 mb-2">
                 <span className="badge text-xs">Kamera: {permission}</span>
                 <span className="badge text-xs">Status: {cameraStatus}</span>
               </div>
               {permission === 'denied' && (
                 <div className="mt-2 p-2 bg-red-900/50 border border-red-700 rounded text-red-200 text-xs">
                   ⚠️ Akses kamera ditolak. Pastikan Anda mengizinkan akses kamera di browser.
                   <button 
                     onClick={retryCamera}
                     className="ml-2 px-2 py-1 bg-red-600 hover:bg-red-500 rounded text-xs"
                   >
                     Coba Lagi
                   </button>
                 </div>
               )}
               {cameraStatus === 'inactive' && permission === 'granted' && (
                 <div className="mt-2 p-2 bg-yellow-900/50 border border-yellow-700 rounded text-yellow-200 text-xs">
                   ⚠️ Kamera tidak aktif. 
                   <button 
                     onClick={retryCamera}
                     className="ml-2 px-2 py-1 bg-yellow-600 hover:bg-yellow-500 rounded text-xs"
                   >
                     Restart Kamera
                   </button>
                 </div>
               )}
               {errorMessage && (
                 <div className="mt-2 p-2 bg-red-900/50 border border-red-700 rounded text-red-200 text-xs">
                   ⚠️ {errorMessage}
                 </div>
               )}
               {previewGesture && !errorMessage && cameraStatus === 'active' && (
                 <div className="mt-2 p-2 bg-green-900/50 border border-green-700 rounded text-green-200 text-xs">
                   ✅ Gesture terdeteksi: {previewGesture}
                 </div>
               )}
               {handOrientation && handOrientation !== 'facing_camera' && (
                 <div className="mt-2 p-2 bg-amber-900/50 border border-amber-700 rounded text-amber-200 text-xs">
                   ⚠️ Orientasi tangan: {handOrientation === 'facing_right' ? 'Menghadap kanan' : 
                                        handOrientation === 'facing_left' ? 'Menghadap kiri' :
                                        handOrientation === 'facing_up' ? 'Menghadap atas' :
                                        'Menghadap bawah'}. Coba putar tangan menghadap kamera untuk deteksi yang lebih baik.
                 </div>
               )}
      </div>
    </div>
  )
}


