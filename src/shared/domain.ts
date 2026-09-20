import { z } from 'zod'
export const musicalSchema = z.object({
  bpm: z.number().min(20).max(400).nullable(),
  key: z.string().max(24).nullable(),
  meter: z.enum(['2/4','3/4','4/4','5/4','6/8','7/8','9/8','12/8']),
  firstBeat: z.number().min(0)
})
export type Musical = z.infer<typeof musicalSchema>
export const trackSchema = z.object({
  id: z.string().uuid(), name: z.string().trim().min(1).max(80),
  role: z.enum(['original', 'stem', 'other']), stem: z.string(),
  assetId: z.string().uuid(), parentId: z.string().uuid().optional(),
  color: z.string(), gain: z.number().min(-60).max(6), muted: z.boolean(), solo: z.boolean(), hidden: z.boolean().optional(),
  peaks: z.array(z.number().min(0).max(1)), duration: z.number().nonnegative(),
  sampleRate: z.number().positive(), channels: z.number().int().min(1).max(32)
})
export type Track = z.infer<typeof trackSchema>
export const projectSchema = z.object({
  schemaVersion: z.literal(1), id: z.string().uuid(), name: z.string().trim().min(1).max(80),
  sourceName: z.string(), createdAt: z.string(), updatedAt: z.string(),
  tracks: z.array(trackSchema), music: musicalSchema,
  recommendation: musicalSchema.partial().nullable(),
  lastSeparation: z.object({
    id:z.string().uuid(),sourceId:z.string().uuid(),retrySourceId:z.string().uuid().optional(),targets:z.array(z.string()),
    state:z.enum(['running','complete','failed','cancelled','interrupted']),
    completed:z.number().int().nonnegative(),startedAt:z.string(),finishedAt:z.string().optional(),error:z.string().optional()
  }).optional(),
  analysis: z.object({analyzedAt:z.string(),warnings:z.array(z.string()),beatCount:z.number().int().nonnegative(),downbeatCount:z.number().int().nonnegative(),keyStrength:z.number().nullable(),errors:z.object({beats:z.string().optional(),key:z.string().optional()}).optional()}).optional(),
  metronome: z.boolean(), clickGain: z.number().min(-60).max(0),
  timeFormat: z.enum(['time','beats']), monitor: z.enum(['original','stems']),
  masterGain: z.number().min(-60).max(6)
})
export type Project = z.infer<typeof projectSchema>
export const settingsSchema = z.object({
  language: z.enum(['zh','en']).default('zh'),
  device: z.enum(['auto','cpu','cuda','mps']).default('auto'),
  modelDirectory: z.string().default(''), exportDirectory: z.string().default('')
})
export type Settings = z.infer<typeof settingsSchema>
export function rename(value: string): string {
  return z.string().trim().min(1, 'Name cannot be empty').max(80).parse(value)
}
/** Commit only a complete task. Never expose partial replacement of a source stem. */
export function commitSeparation(project: Project, sourceId: string, outputs: Track[]): Project {
  const index = project.tracks.findIndex(t => t.id === sourceId)
  if (index < 0) throw new Error('Source track no longer exists')
  const source = project.tracks[index]
  const others = outputs.filter(t => t.role === 'other')
  if (others.length !== 1 || !outputs.some(t => t.role === 'stem') || outputs.some(t => t.role === 'original'))
    throw new Error('Separation must contain stems and exactly one remainder')
  const ordered = [others[0], ...outputs.filter(t => t.role === 'stem')].map(t => trackSchema.parse({
    ...t, name: t.role==='other'&&source.role!=='original' ? `${source.name.slice(0,Math.max(0,80-t.name.length-3))} - ${t.name}` : t.name, hidden:false, parentId: source.id, gain: source.gain, muted: source.muted, solo: source.solo
  }))
  const retained = project.tracks
  const ids = new Set(retained.map(t => t.id))
  for (const t of ordered) { if (ids.has(t.id)) throw new Error('Duplicate track'); ids.add(t.id) }
  const tracks = [...project.tracks]
  tracks.splice(source.role === 'original' ? tracks.length : index, source.role === 'original' ? 0 : 1, ...ordered, ...(source.role === 'original' ? [] : [{...source,hidden:true}]))
  return {...project, tracks, updatedAt: new Date().toISOString()}
}
export function restoreRecommendation(project: Project): Project {
  if (!project.recommendation) return project
  const valid = Object.fromEntries(Object.entries(project.recommendation).filter(([, v]) => v != null))
  return {...project, music: musicalSchema.parse({...project.music, ...valid}), updatedAt: new Date().toISOString()}
}
export function audibleTracks(project: Project): Track[] {
  const tracks = project.tracks.filter(t => !t.hidden && (project.monitor === 'original' ? t.role === 'original' : t.role !== 'original'))
  const solo = tracks.some(t => t.solo)
  return tracks.filter(t => !t.muted && (!solo || t.solo))
}
export function beatPosition(seconds: number, music: Musical) {
  if (!music.bpm) return null
  const [numerator, denominator] = music.meter.split('/').map(Number)
  const beatSeconds = 60 / music.bpm * 4 / denominator
  const elapsed = seconds - music.firstBeat
  if (elapsed < 0) return {bar: 0, beat: 0, beatSeconds}
  const index = Math.floor((elapsed + 1e-8) / beatSeconds)
  return {bar: Math.floor(index / numerator) + 1, beat: index % numerator + 1, beatSeconds}
}
