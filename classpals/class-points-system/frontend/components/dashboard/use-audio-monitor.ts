"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export type AudioPermissionState = "idle" | "requesting" | "granted" | "denied" | "unsupported" | "error"

type UseAudioMonitorOptions = {
  smoothingFactor?: number
}

export function useAudioMonitor(options: UseAudioMonitorOptions = {}) {
  const { smoothingFactor = 0.22 } = options

  const [permissionState, setPermissionState] = useState<AudioPermissionState>("idle")
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [volume, setVolume] = useState(0)
  const [peakVolume, setPeakVolume] = useState(0)

  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null)
  const smoothedVolumeRef = useRef(0)

  const stopMonitoring = useCallback(() => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    sourceRef.current?.disconnect()
    analyserRef.current?.disconnect()

    streamRef.current?.getTracks().forEach((track) => track.stop())

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => undefined)
    }

    sourceRef.current = null
    analyserRef.current = null
    streamRef.current = null
    audioContextRef.current = null
    dataArrayRef.current = null
    smoothedVolumeRef.current = 0

    setIsMonitoring(false)
    setVolume(0)
  }, [])

  const startMonitoring = useCallback(async () => {
    if (typeof window === "undefined") {
      setPermissionState("unsupported")
      return false
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof window.AudioContext === "undefined") {
      setPermissionState("unsupported")
      return false
    }

    stopMonitoring()
    setPermissionState("requesting")

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      const audioContext = new window.AudioContext()
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 2048
      analyser.smoothingTimeConstant = 0.82

      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)

      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)

      streamRef.current = stream
      audioContextRef.current = audioContext
      analyserRef.current = analyser
      sourceRef.current = source
      dataArrayRef.current = dataArray
      smoothedVolumeRef.current = 0

      setPermissionState("granted")
      setPeakVolume(0)
      setVolume(0)
      setIsMonitoring(true)

      const updateVolume = () => {
        const currentAnalyser = analyserRef.current
        const currentDataArray = dataArrayRef.current
        if (!currentAnalyser || !currentDataArray) return

        currentAnalyser.getByteTimeDomainData(currentDataArray)

        let sumSquares = 0
        for (let index = 0; index < currentDataArray.length; index += 1) {
          const normalized = (currentDataArray[index] - 128) / 128
          sumSquares += normalized * normalized
        }

        const rms = Math.sqrt(sumSquares / currentDataArray.length)
        const scaledVolume = Math.min(100, Math.round(rms * 280))
        const nextVolume = Math.round(smoothedVolumeRef.current * (1 - smoothingFactor) + scaledVolume * smoothingFactor)

        smoothedVolumeRef.current = nextVolume
        setVolume(nextVolume)
        setPeakVolume((currentPeak) => Math.max(currentPeak, nextVolume))

        animationFrameRef.current = window.requestAnimationFrame(updateVolume)
      }

      animationFrameRef.current = window.requestAnimationFrame(updateVolume)
      return true
    } catch (error: any) {
      const denialNames = ["NotAllowedError", "PermissionDeniedError", "SecurityError"]
      setPermissionState(denialNames.includes(error?.name) ? "denied" : "error")
      stopMonitoring()
      return false
    }
  }, [smoothingFactor, stopMonitoring])

  const resetPeak = useCallback(() => {
    setPeakVolume(volume)
  }, [volume])

  useEffect(() => stopMonitoring, [stopMonitoring])

  return {
    permissionState,
    isMonitoring,
    volume,
    peakVolume,
    startMonitoring,
    stopMonitoring,
    resetPeak,
  }
}
