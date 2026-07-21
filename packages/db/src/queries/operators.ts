import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types'

type Client = SupabaseClient<Database>
type Operator = Database['public']['Tables']['operators']['Row']

export interface OperatorSiteLink {
  id: string
  name: string
  slug: string
  country: string | null
  depth_max_m: number | null
  type: string
}

export interface BrowseOperatorsOptions {
  country?: string
  techOnly?: boolean
  limit?: number
}

export async function listOperators(
  options: BrowseOperatorsOptions,
  supabase: Client,
): Promise<Operator[]> {
  let q = supabase
    .from('operators')
    .select('*')
    .order('rating', { ascending: false, nullsFirst: false })
    .limit(options.limit ?? 100)
  if (options.country) q = q.eq('country', options.country)
  if (options.techOnly) q = q.eq('tech_certified', true)
  const { data } = await q
  return (data ?? []) as Operator[]
}

export async function getOperatorBySlug(
  slug: string,
  supabase: Client,
): Promise<{ operator: Operator; sites: OperatorSiteLink[] } | null> {
  const { data: operator } = await supabase
    .from('operators')
    .select('*')
    .eq('slug', slug)
    .single()
  if (!operator) return null

  const { data: links } = await supabase
    .from('operator_sites')
    .select('dive_sites!inner(id, name, slug, country, depth_max_m, type)')
    .eq('operator_id', operator.id)
    .limit(50)

  const sites = (links ?? []).map(
    row => (row as unknown as { dive_sites: OperatorSiteLink }).dive_sites,
  )
  return { operator: operator as Operator, sites }
}

/** Distinct countries that have at least one operator, for the filter chips. */
export async function getOperatorCountries(supabase: Client): Promise<string[]> {
  const { data } = await supabase
    .from('operators')
    .select('country')
    .order('country')
    .limit(1000)
  const seen = new Set<string>()
  for (const row of data ?? []) {
    if (row.country) seen.add(row.country)
  }
  return Array.from(seen)
}
