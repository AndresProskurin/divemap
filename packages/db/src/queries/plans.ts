import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types'

type Client = SupabaseClient<Database>
type DivePlan = Database['public']['Tables']['dive_plans']['Row']
type DivePlanInsert = Database['public']['Tables']['dive_plans']['Insert']

/** Plan row joined with the minimal site fields the profile list renders. */
export interface DivePlanWithSite extends DivePlan {
  site: { name: string; slug: string } | null
}

export async function getUserPlans(
  userId: string,
  supabase: Client,
  limit = 100,
): Promise<DivePlanWithSite[]> {
  const { data } = await supabase
    .from('dive_plans')
    .select('*, site:site_id(name, slug)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data ?? []) as unknown as DivePlanWithSite[]
}

export async function insertPlan(
  plan: DivePlanInsert,
  supabase: Client,
): Promise<{ id: string } | { error: string }> {
  const { data, error } = await supabase
    .from('dive_plans')
    .insert(plan)
    .select('id')
    .single()
  if (error) return { error: error.message }
  return { id: data.id }
}

export async function deletePlan(planId: string, supabase: Client): Promise<void> {
  await supabase.from('dive_plans').delete().eq('id', planId)
}
