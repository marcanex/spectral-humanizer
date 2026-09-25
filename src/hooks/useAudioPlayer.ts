import { useCallback, useEffect, useRef, useState } from 'react'

export function useAudioPlayer() {
  const ctxRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const startAtRef = useRef(0)
  const offsetRef = useRef(0)
  const bufferRef = useRef<AudioBuffer | null>(null)

  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const ensureCtx = useCallback(async () => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext()
      gainRef.current = ctxRef.current.createGain()
      gainRef.current.connect(ctxRef.current.destination)
    }
    if (ctxRef.current.state === 'suspended') await ctxRef.current.resume()
    return ctxRef.current
  }, [])

  const stop = useCallback(() => {
    try {
      sourceRef.current?.stop()
    } catch {
      /* already stopped */
    }
    sourceRef.current = null
    setPlaying(false)
  }, [])

  const load = useCallback(
    (buffer: AudioBuffer | null) => {
      stop()
      bufferRef.current = buffer
      offsetRef.current = 0
      setCurrentTime(0)
      setDuration(buffer?.duration ?? 0)
    },
    [stop],
  )

  const play = useCallback(
    async (from?: number) => {
      const buffer = bufferRef.current
      if (!buffer) return
      const ctx = await ensureCtx()
      stop()
      const src = ctx.createBufferSource()
      src.buffer = buffer
      src.connect(gainRef.current!)
      const offset = from ?? offsetRef.current
      src.onended = () => {
        if (sourceRef.current === src) {
          setPlaying(false)
          offsetRef.current = 0
          setCurrentTime(0)
        }
      }
      src.start(0, offset)
      sourceRef.current = src
      startAtRef.current = ctx.currentTime - offset
      offsetRef.current = offset
      setPlaying(true)
    },
    [ensureCtx, stop],
  )

  const pause = useCallback(() => {
    if (!playing || !ctxRef.current) return
    const t = ctxRef.current.currentTime - startAtRef.current
    offsetRef.current = Math.min(t, bufferRef.current?.duration ?? t)
    setCurrentTime(offsetRef.current)
    stop()
  }, [playing, stop])

  const seek = useCallback(
    (t: number) => {
      const d = bufferRef.current?.duration ?? 0
      const clamped = Math.max(0, Math.min(d, t))
      offsetRef.current = clamped
      setCurrentTime(clamped)
      if (playing) void play(clamped)
    },
    [play, playing],
  )

  const toggle = useCallback(() => {
    if (playing) pause()
    else void play()
  }, [pause, play, playing])

  useEffect(() => {
    if (!playing) return
    let raf = 0
    const tick = () => {
      if (ctxRef.current && bufferRef.current) {
        const t = ctxRef.current.currentTime - startAtRef.current
        setCurrentTime(Math.min(t, bufferRef.current.duration))
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing])

  useEffect(() => {
    return () => {
      stop()
      void ctxRef.current?.close()
    }
  }, [stop])

  return {
    playing,
    currentTime,
    duration,
    load,
    play,
    pause,
    stop,
    seek,
    toggle,
  }
}
