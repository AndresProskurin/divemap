import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types'

type Client = SupabaseClient<Database>

export interface InsertDiveInput {
  userId: string
  siteId?: string | null
  divedAt: string
  maxDepthM: number
  bottomTimeMin: number
  gasO2?: number | null
  gasHe?: number | null
  vizM?: number | null
  buddy?: string | null
  notes?: string | null
  rating?: number | null
}

export async function insertDive(
  input: InsertDiveInput,
  supabase: Client,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('dives').insert({
    user_id: input.userId,
    site_id: input.siteId ?? null,
    dived_at: input.divedAt,
    max_depth_m: input.maxDepthM,
    bottom_time_min: input.bottomTimeMin,
    gas_o2: input.gasO2 ?? null,
    gas_he: input.gasHe ?? null,
    viz_m: input.vizM ?? null,
    buddy: input.buddy ?? null,
    notes: input.notes ?? null,
    rating: input.rating ?? null,
    is_public: true,
  })
  return { error: error?.message ?? null }
}
