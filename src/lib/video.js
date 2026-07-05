// Classify a location's Video URL. Two very different things can live in that field:
//  - a direct video FILE (mp4/webm/…) we can play as a muted, looping hero background;
//  - a YouTube LINK, which is a web page, not a file – it can't drive a <video> element,
//    so we embed it as a player in the story body instead.
// Anything else (a random link) is ignored, so it can never blank the hero image.

export function isFileVideo(url) {
  return /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(url || '')
}

// Pull a video id out of the common YouTube URL shapes (watch, youtu.be, embed,
// shorts, live). Returns null for anything that isn't recognisably YouTube.
const YT = /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/
export function youtubeId(url) {
  const m = YT.exec(url || '')
  return m ? m[1] : null
}

// Privacy-friendly embed URL (no cookies until play), matching the app's light-touch ethos.
export function youtubeEmbed(url) {
  const id = youtubeId(url)
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null
}

// Is this Video URL usable at all (a playable file or a YouTube link)?
export function isPlayableVideo(url) {
  return isFileVideo(url) || !!youtubeId(url)
}
