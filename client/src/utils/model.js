import * as tf from '@tensorflow/tfjs'

let model = null

export async function loadModel() {
  if (model) return model
  try {
    model = await tf.loadGraphModel('/model/model.json')
    return model
  } catch (e) {
    // Model belum tersedia, biarkan null
    return null
  }
}

// Dummy gesture: gunakan sementara sampai model tersedia
export function getDummyGesture() {
  const arr = ['rock', 'paper', 'scissors']
  return arr[Math.floor(Math.random() * arr.length)]
}


