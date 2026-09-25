/** Encode an AudioBuffer as a 16-bit or 32-bit float WAV ArrayBuffer. */
export function encodeWav(buffer: AudioBuffer, bitDepth: 16 | 32 = 16): ArrayBuffer {
  const numChannels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const numFrames = buffer.length
  const bytesPerSample = bitDepth === 16 ? 2 : 4
  const blockAlign = numChannels * bytesPerSample
  const dataSize = numFrames * blockAlign
  const headerSize = 44
  const ab = new ArrayBuffer(headerSize + dataSize)
  const view = new DataView(ab)

  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i))
  }

  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, bitDepth === 16 ? 1 : 3, true) // PCM or IEEE float
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitDepth, true)
  writeStr(36, 'data')
  view.setUint32(40, dataSize, true)

  const channels: Float32Array[] = []
  for (let c = 0; c < numChannels; c++) channels.push(buffer.getChannelData(c))

  let offset = 44
  if (bitDepth === 16) {
    for (let i = 0; i < numFrames; i++) {
      for (let c = 0; c < numChannels; c++) {
        let s = channels[c]![i]!
        s = Math.max(-1, Math.min(1, s))
        view.setInt16(offset, (s * 0x7fff) | 0, true)
        offset += 2
      }
    }
  } else {
    for (let i = 0; i < numFrames; i++) {
      for (let c = 0; c < numChannels; c++) {
        view.setFloat32(offset, channels[c]![i]!, true)
        offset += 4
      }
    }
  }
  return ab
}

export function downloadWav(buffer: AudioBuffer, filename: string, bitDepth: 16 | 32 = 16): void {
  const ab = encodeWav(buffer, bitDepth)
  const blob = new Blob([ab], { type: 'audio/wav' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.wav') ? filename : `${filename}.wav`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}
