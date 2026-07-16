import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, DiveSite, ConditionsReport, SitePhoto, Operator } from '../index'

type Client = SupabaseClient<Database>

export async function getSiteBySlug(slug: string, supabase: Client): Promise<DiveSite | null> {
  const { data } = await supabase
    .from('dive_sites')
    .select('*')
    .eq('slug', slug)
    .single()
  return data ?? null
}

export async function getSiteConditions(
  siteId: string,
  supabase: Client,
): Promise<ConditionsReport[]> {
  const { data } = await supabase
    .from('conditions_reports')
    .select('*')
    .eq('site_id', siteId)
    .order('reported_at', { ascending: false })
    .limit(10)
  return (data ?? []) as ConditionsReport[]
}

export async function getSitePhotos(siteId: string, supabase: Client): Promise<SitePhoto[]> {
  const { data } = await supabase
    .from('site_photos')
    .select('*')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false })
    .limit(50)
  return (data ?? []) as SitePhoto[]
}

export interface OperatorWithSite extends Operator {
  tech_certified: boolean
}

export async function getSiteOperators(siteId: string, supabase: Client): Promise<Operator[]> {
  const { data } = await supabase
    .from('operator_sites')
    .select('operators!inner(*)')
    .eq('site_id', siteId)
  if (!data) return []
  return data.map((row) => (row as unknown as { operators: Operator }).operators)
}

export interface MarineSpecies {
  id: string
  common_name: string
  color: string | null
}

export async function getSiteMarineLife(
  siteId: string,
  supabase: Client,
): Promise<MarineSpecies[]> {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const { data } = await supabase
    .from('species_sightings')
    .select('species:species_id(id, common_name, color)')
    .eq('site_id', siteId)
    .gte('sighted_at', thirtyDaysAgo.toISOString())
    .limit(20)
  if (!data) return []
  const seen = new Set<string>()
  const result: MarineSpecies[] = []
  for (const row of data) {
    const s = (row as unknown as { species: MarineSpecies }).species
    if (s && !seen.has(s.id)) {
      seen.add(s.id)
      result.push(s)
    }
  }
  return result
}

export async function getTopSiteSlugs(limit: number, supabase: Client): Promise<string[]> {
  const { data } = await supabase
    .from('dive_sites')
    .select('slug')
    .order('rating', { ascending: false })
    .limit(limit)
  return (data ?? []).map((s) => s.slug)
}

export interface SiteSearchResult {
  id: string
  name: string
  slug: string
  country: string | null
  depth_max_m: number | null
}

export async function searchSites(
  query: string,
  supabase: Client,
  limit = 8,
): Promise<SiteSearchResult[]> {
  if (!query.trim()) return []
  const { data } = await supabase
    .from('dive_sites')
    .select('id, name, slug, country, depth_max_m')
    .ilike('name', `%${query.trim()}%`)
    .order('rating', { ascending: false })
    .limit(limit)
  return (data ?? []) as SiteSearchResult[]
}
