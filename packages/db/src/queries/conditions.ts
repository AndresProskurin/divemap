import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types'

type Client = SupabaseClient<Database>
type CurrentLevel = Database['public']['Enums']['current_level']

export interface InsertConditionsReportInput {
  siteId: string
  reporterId: string
  vizM: number
  currentLevel: CurrentLevel
  tempSurfaceC?: number
  tempBottomC?: number
  notes?: string
}

export async function insertConditionsReport(
  input: InsertConditionsReportInput,
  supabase: Client,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('conditions_reports').insert({
    site_id: input.siteId,
    reporter: input.reporterId,
    viz_m: input.vizM,
    current_level: input.currentLevel,
    temp_surface_c: input.tempSurfaceC ?? null,
    temp_bottom_c: input.tempBottomC ?? null,
    notes: input.notes ?? null,
  })
  return { error: error?.message ?? null }
}
