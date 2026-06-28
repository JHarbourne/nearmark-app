#!/usr/bin/env node
// Generate supabase/seed.sql (INSERT statements) from src/data/seed.js so the
// 20 locations + tour can be loaded by pasting into the Supabase SQL Editor —
// no service-role key needed. Run: node supabase/gen-seed-sql.mjs

import { writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SEED_LOCATIONS, SEED_TOURS } from '../src/data/seed.js'

const here = dirname(fileURLToPath(import.meta.url))

// dollar-quote text so apostrophes/newlines need no escaping (tag avoids clashes)
function q(v) {
  if (v === null || v === undefined || v === '') return 'NULL'
  return `$b$${String(v)}$b$`
}
function num(v) {
  return v === null || v === undefined || v === '' ? 'NULL' : Number(v)
}
function arr(a) {
  if (!a || !a.length) return `'{}'`
  return `'{${a.map((s) => `"${s}"`).join(',')}}'`
}

const locCols = [
  'slug', 'title', 'city', 'period', 'significance', 'summary', 'wiki_url', 'lat', 'lng',
  'trigger_radius', 'hero_image_url', 'historic_image_url', 'photo_credit', 'photo_credit_url',
  'video_url', 'audio_url', 'audio_duration', 'thumbnail_url', 'hue', 'related_ids', 'tour_num',
  'status', 'notes_internal',
]
const locValues = SEED_LOCATIONS.map((l) => `(${[
  q(l.id), q(l.title), q(l.city), q(l.period), q(l.significance), q(l.summary), q(l.wikiUrl),
  num(l.lat), num(l.lng), num(l.triggerRadius), q(l.heroImageUrl), q(l.historicImageUrl),
  q(l.photoCredit), q(l.photoCreditUrl), q(l.videoUrl), q(l.audioUrl), num(l.audioDuration),
  q(l.thumbnailUrl), q(l.hue), arr(l.relatedIds), num(l.tourNum), q(l.status), q(l.notesInternal),
].join(', ')})`)

const tourCols = ['slug', 'title', 'city', 'theme', 'description', 'cover_image_url', 'status', 'stop_ids', 'duration_override_mins']
const tourValues = SEED_TOURS.map((t) => `(${[
  q(t.id), q(t.title), q(t.city), q(t.theme), q(t.description), q(t.coverImageUrl), q(t.status),
  arr(t.stopIds), num(t.durationOverrideMins),
].join(', ')})`)

const sql = `-- Nearmark example seed data – generated from src/data/seed.js
-- Paste into the Supabase SQL Editor AFTER running schema.sql.
-- Re-runnable: ON CONFLICT (slug) updates the row.

insert into public.locations (${locCols.join(', ')}) values
${locValues.join(',\n')}
on conflict (slug) do update set
${locCols.filter((c) => c !== 'slug').map((c) => `  ${c} = excluded.${c}`).join(',\n')};

insert into public.tours (${tourCols.join(', ')}) values
${tourValues.join(',\n')}
on conflict (slug) do update set
${tourCols.filter((c) => c !== 'slug').map((c) => `  ${c} = excluded.${c}`).join(',\n')};
`

writeFileSync(resolve(here, 'seed.sql'), sql)
console.log(`✓ Wrote supabase/seed.sql — ${SEED_LOCATIONS.length} locations, ${SEED_TOURS.length} tour(s)`)
