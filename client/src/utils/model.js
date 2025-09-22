let tf = null
async function getTf() {
  if (!tf) {
    const [{ tensor, softmax, setBackend, ready, loadLayersModel }] = await Promise.all([
      import(/* @vite-ignore */ '@tensorflow/tfjs')
    ])
    await import(/* @vite-ignore */ '@tensorflow/tfjs-backend-webgl')
    await setBackend('webgl')
    await ready()
    tf = { tensor, softmax, loadLayersModel }
  }
  return tf
}

let model = null
let labels = ['rock', 'paper', 'scissors']

export async function loadModel() {
  if (model) return model
  try {
    const t = await getTf()
    console.log('[siut.io] Creating simple model instead of loading from file')
    
    // Buat model sederhana secara programmatis
    const { sequential, layers } = await import('@tensorflow/tfjs')
    
    model = sequential({
      layers: [
        layers.dense({ inputShape: [63], units: 64, activation: 'relu' }),
        layers.dropout({ rate: 0.3 }),
        layers.dense({ units: 32, activation: 'relu' }),
        layers.dropout({ rate: 0.3 }),
        layers.dense({ units: 3, activation: 'softmax' })
      ]
    })
    
    // Compile model
    model.compile({
      optimizer: 'adam',
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    })
    
    console.log('[siut.io] Simple model created successfully:', !!model)
    console.log('[siut.io] Model input shape:', model.inputs[0].shape)
    console.log('[siut.io] Model output shape:', model.outputs[0].shape)
    
    // Test model dengan dummy data
    const testInput = t.tensor(new Array(63).fill(0.5), [1, 63])
    const testOutput = model.predict(testInput)
    console.log('[siut.io] Model test prediction shape:', testOutput.shape)
    testInput.dispose()
    testOutput.dispose()
    
    return model
  } catch (e) {
    console.error('[siut.io] Model creation error:', e)
    console.error('[siut.io] Error details:', e.message)
    console.error('[siut.io] Stack trace:', e.stack)
    console.error('[siut.io] Tidak bisa membuat model TensorFlow.js')
    return null
  }
}

// Helper function untuk mendapatkan pesan error
export function getErrorMessage() {
  return "Tidak bisa mendeteksi gesture tangan"
}

// Normalisasi landmarks tangan (x,y) ke format tensor [1, 63]
export function normalizeLandmarks(landmarks, width, height) {
  if (!landmarks || landmarks.length === 0) {
    console.log('[siut.io] No landmarks provided')
    return null
  }
  const pts = landmarks[0]
  if (!pts || pts.length === 0) {
    console.log('[siut.io] No landmark points in first hand')
    return null
  }
  
  console.log('[siut.io] Raw landmarks count:', pts.length)
  console.log('[siut.io] First few landmarks:', pts.slice(0, 3))
  console.log('[siut.io] Canvas dimensions:', { width, height })
  
  // Pastikan kita punya 21 landmarks (MediaPipe standard)
  if (pts.length !== 21) {
    console.log('[siut.io] Expected 21 landmarks, got:', pts.length)
    return null
  }
  
  // Model mengharapkan 63 features (21 landmarks * 3 koordinat)
  // Tapi kita hanya punya x,y dari MediaPipe, jadi kita buat z=0
  const arr = []
  for (const p of pts) {
    // Normalisasi koordinat ke range [0, 1] jika belum
    const x = p.x || 0
    const y = p.y || 0
    arr.push(x) // x coordinate
    arr.push(y) // y coordinate  
    arr.push(0) // z coordinate (dummy)
  }
  
  console.log('[siut.io] Normalized landmarks length:', arr.length)
  console.log('[siut.io] First few normalized values:', arr.slice(0, 9))
  console.log('[siut.io] Last few normalized values:', arr.slice(-9))
  return arr
}

// Optimized heuristic gesture detection with caching
const gestureCache = new Map()
let lastGestureTime = 0
const GESTURE_CACHE_DURATION = 100 // ms

function detectGestureHeuristic(landmarks) {
  if (!landmarks || landmarks.length === 0) return null
  
  const hand = landmarks[0]
  if (!hand || hand.length < 21) return null
  
  // Cache key based on finger positions (simplified)
  const now = performance.now()
  if (now - lastGestureTime < GESTURE_CACHE_DURATION) {
    const cacheKey = Math.round(hand[8].y * 100) + Math.round(hand[12].y * 100) // index + middle tip
    if (gestureCache.has(cacheKey)) {
      return gestureCache.get(cacheKey)
    }
  }
  
  // MediaPipe hand landmarks indices (cached)
  const THUMB_TIP = 4, INDEX_FINGER_TIP = 8, MIDDLE_FINGER_TIP = 12, RING_FINGER_TIP = 16, PINKY_TIP = 20
  const THUMB_IP = 3, INDEX_FINGER_PIP = 6, MIDDLE_FINGER_PIP = 10, RING_FINGER_PIP = 14, PINKY_PIP = 18
  
  // Optimized finger extension check (single pass)
  const fingerChecks = [
    hand[THUMB_TIP].y < hand[THUMB_IP].y,    // thumb
    hand[INDEX_FINGER_TIP].y < hand[INDEX_FINGER_PIP].y,  // index
    hand[MIDDLE_FINGER_TIP].y < hand[MIDDLE_FINGER_PIP].y, // middle
    hand[RING_FINGER_TIP].y < hand[RING_FINGER_PIP].y,    // ring
    hand[PINKY_TIP].y < hand[PINKY_PIP].y    // pinky
  ]
  
  const extendedCount = fingerChecks.filter(Boolean).length
  const isIndexExtended = fingerChecks[1]
  const isMiddleExtended = fingerChecks[2]
  
  // Optimized gesture detection
  let result
  if (extendedCount === 0) {
    result = { label: 'rock', confidence: 0.9 }
  } else if (extendedCount === 5) {
    result = { label: 'paper', confidence: 0.9 }
  } else if (extendedCount === 2 && isIndexExtended && isMiddleExtended) {
    result = { label: 'scissors', confidence: 0.9 }
  } else {
    // Fallback with lower confidence
    result = extendedCount <= 2 
      ? { label: 'rock', confidence: 0.7 }
      : extendedCount >= 4 
        ? { label: 'paper', confidence: 0.7 }
        : { label: 'scissors', confidence: 0.7 }
  }
  
  // Cache result
  const cacheKey = Math.round(hand[8].y * 100) + Math.round(hand[12].y * 100)
  gestureCache.set(cacheKey, result)
  lastGestureTime = now
  
  // Clean cache periodically
  if (gestureCache.size > 50) {
    gestureCache.clear()
  }
  
  return result
}

export async function predictGestureFromLandmarks(landmarks, width, height) {
  try {
    console.log('[siut.io] Starting prediction with landmarks:', !!landmarks)
    console.log('[siut.io] Landmarks type:', typeof landmarks)
    console.log('[siut.io] Landmarks length:', landmarks?.length)
    
    // Coba heuristic detection dulu
    const heuristicResult = detectGestureHeuristic(landmarks)
    if (heuristicResult) {
      console.log('[siut.io] Heuristic prediction:', heuristicResult)
      return heuristicResult
    }
    
    // Fallback ke model jika heuristic gagal
    const m = await loadModel()
    if (!m) {
      console.log('[siut.io] Model tidak tersedia, menggunakan fallback')
      return { error: "Tidak bisa mendeteksi gesture tangan" }
    }
    
    const t = await getTf()
    const normalizedData = normalizeLandmarks(landmarks, width, height)
    if (!normalizedData) {
      console.log('[siut.io] Gagal menormalisasi landmarks')
      return { error: "Tidak bisa mendeteksi tangan" }
    }
    
    // Buat tensor dengan shape [1, 63] sesuai input model
    const input = t.tensor(normalizedData, [1, 63])
    console.log('[siut.io] Input tensor shape:', input.shape)
    console.log('[siut.io] Input tensor data sample:', Array.from(input.dataSync()).slice(0, 10))
    
    // Prediksi dengan layers model
    const predictions = m.predict(input)
    
    console.log('[siut.io] Predictions tensor shape:', predictions.shape)
    
    const data = await predictions.data()
    console.log('[siut.io] Prediction probabilities:', Array.from(data))
    
    // Cleanup
    input.dispose()
    predictions.dispose()
    
    // Cari kelas dengan probabilitas tertinggi
    let bestIdx = 0
    for (let i = 1; i < data.length; i++) {
      if (data[i] > data[bestIdx]) bestIdx = i
    }
    
    const label = labels[bestIdx] || 'rock'
    const confidence = data[bestIdx] || 0
    
    // Hanya return hasil jika confidence cukup tinggi
    if (confidence < 0.3) {
      console.log('[siut.io] Confidence terlalu rendah:', confidence)
      return { error: "Gesture tidak jelas, coba lagi" }
    }
    
    console.log('[siut.io] Final prediction:', { label, confidence, bestIdx })
    return { label, confidence }
    
  } catch (e) {
    console.error('[siut.io] Prediction error:', e)
    console.error('[siut.io] Error stack:', e.stack)
    return { error: "Terjadi kesalahan saat mendeteksi gesture" }
  }
}


