import type { SupabaseClient } from '@supabase/supabase-js'
import type { DailyQuote } from '@/components/dashboard/today/today-queue-types'

function hashCode(str: string): number {
  let h = 0
  for (const ch of str) { h = (Math.imul(31, h) + ch.charCodeAt(0)) | 0 }
  return h
}

export async function getDailyQuote(
  supabase: SupabaseClient,
  userId: string,
  now = new Date(),
): Promise<DailyQuote | null> {
  const hour = now.getHours()
  const tone = hour >= 5 && hour < 12 ? 'morning' : 'reflective'
  const seed = `${now.toISOString().slice(0, 10)}-${userId}`

  const { data } = await supabase
    .from('inspiration_quotes')
    .select('text, attribution')
    .in('tone_tag', [tone, 'general'])
    .eq('is_active', true)

  if (!data?.length) return null
  const idx = Math.abs(hashCode(seed)) % data.length
  return data[idx] as DailyQuote
}
