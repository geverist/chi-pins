import { useState, useEffect, useRef } from 'react'
import * as faceapi from 'face-api.js'

export function useFaceRecognition() {
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const modelsLoadedRef = useRef(false)

  // Load face-api.js models
  useEffect(() => {
    const loadModels = async () => {
      if (modelsLoadedRef.current) return

      try {
        console.log('[FaceRecognition] Loading models...')
        const MODEL_URL = '/models' // We'll need to add these to public folder

        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ])

        modelsLoadedRef.current = true
        setModelsLoaded(true)
        console.log('[FaceRecognition] Models loaded successfully')
      } catch (error) {
        console.error('[FaceRecognition] Error loading models:', error)
      }
    }

    loadModels()
  }, [])

  /**
   * Capture a photo from the video stream (silent background capture)
   * @param {HTMLVideoElement} videoElement - Video element with active stream
   * @returns {Promise<string|null>} Base64 data URL of captured photo
   */
  const capturePhoto = async (videoElement) => {
    if (!videoElement) return null

    try {
      // Create a canvas to capture the current video frame
      const canvas = document.createElement('canvas')
      canvas.width = videoElement.videoWidth
      canvas.height = videoElement.videoHeight

      const ctx = canvas.getContext('2d')
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)

      // Convert to base64 JPEG (smaller file size than PNG)
      const photoDataURL = canvas.toDataURL('image/jpeg', 0.85)

      console.log('[FaceRecognition] Photo captured silently')
      return photoDataURL
    } catch (error) {
      console.error('[FaceRecognition] Error capturing photo:', error)
      return null
    }
  }

  /**
   * Detect a face in the video stream and extract face descriptor
   * @param {HTMLVideoElement} videoElement - Video element with active stream
   * @param {boolean} capturePhotoOnDetection - Whether to capture photo when face detected
   * @returns {Promise<{descriptor: Float32Array, photo: string}|null>} Face data or null
   */
  const detectFace = async (videoElement, capturePhotoOnDetection = false) => {
    if (!modelsLoaded || !videoElement) {
      console.warn('[FaceRecognition] Models not loaded or no video element')
      return null
    }

    try {
      setIsProcessing(true)

      const detection = await faceapi
        .detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor()

      setIsProcessing(false)

      if (detection) {
        console.log('[FaceRecognition] Face detected')

        // Silently capture photo if requested
        const photo = capturePhotoOnDetection ? await capturePhoto(videoElement) : null

        return {
          descriptor: detection.descriptor,
          photo,
          boundingBox: detection.detection.box,
          confidence: detection.detection.score,
        }
      } else {
        console.log('[FaceRecognition] No face detected')
        return null
      }
    } catch (error) {
      console.error('[FaceRecognition] Error detecting face:', error)
      setIsProcessing(false)
      return null
    }
  }

  /**
   * Compare a face descriptor against stored employee descriptors
   * @param {Float32Array} faceDescriptor - Face descriptor to match
   * @param {Array} employees - Array of employee objects with face_descriptor field
   * @param {number} threshold - Match threshold (0.6 is recommended, lower = stricter)
   * @returns {Object|null} Matched employee or null
   */
  const matchFace = (faceDescriptor, employees, threshold = 0.6) => {
    if (!faceDescriptor || !employees || employees.length === 0) {
      return null
    }

    let bestMatch = null
    let bestDistance = Infinity

    for (const employee of employees) {
      if (!employee.face_descriptor) continue

      try {
        // Convert stored descriptor back to Float32Array
        const storedDescriptor = new Float32Array(employee.face_descriptor)

        // Calculate Euclidean distance
        const distance = faceapi.euclideanDistance(faceDescriptor, storedDescriptor)

        console.log(`[FaceRecognition] Distance to ${employee.name}: ${distance}`)

        if (distance < threshold && distance < bestDistance) {
          bestDistance = distance
          bestMatch = {
            ...employee,
            matchConfidence: 1 - distance, // Convert distance to confidence score
            matchDistance: distance
          }
        }
      } catch (error) {
        console.error(`[FaceRecognition] Error matching ${employee.name}:`, error)
      }
    }

    if (bestMatch) {
      console.log(`[FaceRecognition] Match found: ${bestMatch.name} (confidence: ${bestMatch.matchConfidence.toFixed(2)})`)
    } else {
      console.log('[FaceRecognition] No match found')
    }

    return bestMatch
  }

  /**
   * Capture and process a face from video stream
   * @param {HTMLVideoElement} videoElement - Video element
   * @param {Array} employees - Employee database
   * @param {boolean} capturePhoto - Whether to capture photo silently
   * @returns {Promise<Object|null>} Matched employee with photo or null
   */
  const recognizeFace = async (videoElement, employees, capturePhoto = true) => {
    const faceData = await detectFace(videoElement, capturePhoto)
    if (!faceData) return null

    const matchedEmployee = matchFace(faceData.descriptor, employees)

    if (matchedEmployee && faceData.photo) {
      // Include the captured photo with the matched employee
      return {
        ...matchedEmployee,
        capturedPhoto: faceData.photo,
        capturedAt: new Date().toISOString(),
        faceConfidence: faceData.confidence,
      }
    }

    return matchedEmployee
  }

  return {
    modelsLoaded,
    isProcessing,
    detectFace,
    matchFace,
    recognizeFace,
    capturePhoto,
  }
}
