// Client-side image optimisation before upload. A typical phone photo is several
// MB; downscaling to a sensible max dimension and re-encoding as WebP keeps stored
// files small (usually 150–400 KB), which directly improves load performance for
// the public app. Falls back to the original file if anything goes wrong.

export async function compressImage(file, { maxDim = 1600, quality = 0.82 } = {}) {
  if (!file || !file.type?.startsWith('image/') || file.type === 'image/gif') return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h)
    bitmap.close?.()
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/webp', quality))
    if (!blob || blob.size >= file.size) return file // keep original if not smaller
    const name = file.name.replace(/\.[^.]+$/, '') + '.webp'
    return new File([blob], name, { type: 'image/webp' })
  } catch {
    return file
  }
}
