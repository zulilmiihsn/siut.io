let tf = null
async function getTf() {
  if (!tf) {
    const [{ tensor, setBackend, ready }] = await Promise.all([
      import(/* @vite-ignore */ '@tensorflow/tfjs')
    ])
    await import(/* @vite-ignore */ '@tensorflow/tfjs-backend-webgl')
    await setBackend('webgl')
    await ready()
    tf = { tensor }
  }
  return tf
}

let model = null
let labels = ['rock', 'paper', 'scissors']

export async function loadModel() {
  if (model) return model
  try {
    const t = await getTf()
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
    
    // Test model dengan dummy data
    const testInput = t.tensor(new Array(63).fill(0.5), [1, 63])
    const testOutput = model.predict(testInput)
    testInput.dispose()
    testOutput.dispose()
    
    return model
  } catch (e) {
    console.error('[siut.io] Model creation failed:', e.message)
    return null
  }
}

// Helper function removed - not used

// Normalisasi landmarks tangan (x,y) ke format tensor [1, 63]
export function normalizeLandmarks(landmarks, width, height) {
  if (!landmarks || landmarks.length === 0) {
    return null
  }
  const pts = landmarks[0]
  if (!pts || pts.length === 0) {
    return null
  }
  
  // Pastikan kita punya 21 landmarks (MediaPipe standard)
  if (pts.length !== 21) {
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
  
  // Optimized finger extension check for different orientations
  // Check both Y-axis (vertical) and X-axis (horizontal) for side-facing hands
  const fingerChecks = [
    // Thumb - check both Y and X axes
    (hand[THUMB_TIP].y < hand[THUMB_IP].y) || (Math.abs(hand[THUMB_TIP].x - hand[THUMB_IP].x) > 0.05),
    // Index finger - check both Y and X axes
    (hand[INDEX_FINGER_TIP].y < hand[INDEX_FINGER_PIP].y) || (Math.abs(hand[INDEX_FINGER_TIP].x - hand[INDEX_FINGER_PIP].x) > 0.05),
    // Middle finger - check both Y and X axes
    (hand[MIDDLE_FINGER_TIP].y < hand[MIDDLE_FINGER_PIP].y) || (Math.abs(hand[MIDDLE_FINGER_TIP].x - hand[MIDDLE_FINGER_PIP].x) > 0.05),
    // Ring finger - check both Y and X axes
    (hand[RING_FINGER_TIP].y < hand[RING_FINGER_PIP].y) || (Math.abs(hand[RING_FINGER_TIP].x - hand[RING_FINGER_PIP].x) > 0.05),
    // Pinky - check both Y and X axes
    (hand[PINKY_TIP].y < hand[PINKY_PIP].y) || (Math.abs(hand[PINKY_TIP].x - hand[PINKY_PIP].x) > 0.05)
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
    // Coba heuristic detection dulu
    const heuristicResult = detectGestureHeuristic(landmarks)
    if (heuristicResult) {
      return heuristicResult
    }
    
    // Fallback ke model jika heuristic gagal
    const m = await loadModel()
    if (!m) {
      return { error: "Tidak bisa mendeteksi gesture tangan" }
    }
    
    const t = await getTf()
    const normalizedData = normalizeLandmarks(landmarks, width, height)
    if (!normalizedData) {
      return { error: "Tidak bisa mendeteksi tangan" }
    }
    
    // Buat tensor dengan shape [1, 63] sesuai input model
    const input = t.tensor(normalizedData, [1, 63])
    
    // Prediksi dengan layers model
    const predictions = m.predict(input)
    
    const data = await predictions.data()
    
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
      return { error: "Gesture tidak jelas, coba lagi" }
    }
    
    return { label, confidence }
    
  } catch (e) {
    console.error('[siut.io] Prediction error:', e.message)
    return { error: "Terjadi kesalahan saat mendeteksi gesture" }
  }
}


