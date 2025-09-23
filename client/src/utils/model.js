
// Optimized heuristic gesture detection with caching
const gestureCache = new Map()
let lastGestureTime = 0
const GESTURE_CACHE_DURATION = 80 // ms (lebih responsif)

function distance(a, b) {
  const dx = (a.x || 0) - (b.x || 0)
  const dy = (a.y || 0) - (b.y || 0)
  return Math.hypot(dx, dy)
}

function isFingerExtended(hand, tipIdx, pipIdx, wristIdx = 0) {
  const tip = hand[tipIdx]
  const pip = hand[pipIdx]
  const wrist = hand[wristIdx]
  if (!tip || !pip || !wrist) return false
  // Kriteria 1: jarak tip ke wrist lebih besar dari pip ke wrist dengan margin
  const dTip = distance(tip, wrist)
  const dPip = distance(pip, wrist)
  const distanceExtended = dTip > dPip + 0.06
  // Kriteria 2: perbandingan sumbu untuk tangan menghadap samping/atas
  const axisExtended = (tip.y < pip.y - 0.02) || (Math.abs(tip.x - pip.x) > 0.06)
  return distanceExtended || axisExtended
}

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
  
  // Finger extension check yang lebih robust
  const fingerChecks = [
    isFingerExtended(hand, THUMB_TIP, THUMB_IP),
    isFingerExtended(hand, INDEX_FINGER_TIP, INDEX_FINGER_PIP),
    isFingerExtended(hand, MIDDLE_FINGER_TIP, MIDDLE_FINGER_PIP),
    isFingerExtended(hand, RING_FINGER_TIP, RING_FINGER_PIP),
    isFingerExtended(hand, PINKY_TIP, PINKY_PIP)
  ]
  
  const extendedCount = fingerChecks.filter(Boolean).length
  const isIndexExtended = fingerChecks[1]
  const isMiddleExtended = fingerChecks[2]
  
  // Optimized gesture detection
  let result
  if (extendedCount === 0) {
    result = { label: 'rock', confidence: 0.95 }
  } else if (extendedCount === 5) {
    result = { label: 'paper', confidence: 0.95 }
  } else if (extendedCount === 2 && isIndexExtended && isMiddleExtended) {
    result = { label: 'scissors', confidence: 0.95 }
  } else {
    // Fallback dengan confidence proporsional
    const conf = Math.min(0.9, 0.5 + 0.1 * Math.abs(extendedCount - 3))
    result = extendedCount <= 2 
      ? { label: 'rock', confidence: conf }
      : extendedCount >= 4 
        ? { label: 'paper', confidence: conf }
        : { label: 'scissors', confidence: conf }
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
    
    return { error: "Tidak bisa mendeteksi gesture tangan" }
    
  } catch (e) {
    console.error('[siut.io] Prediction error:', e.message)
    return { error: "Terjadi kesalahan saat mendeteksi gesture" }
  }
}


