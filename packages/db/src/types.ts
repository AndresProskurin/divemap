/**
 * Database types for DiveMap.
 *
 * Hand-authored to mirror `schema.sql` in the shape the Supabase CLI emits, so
 * it can be regenerated in place once the cloud project exists:
 *
 *   SUPABASE_PROJECT_ID=<id> pnpm db:types
 *
 * Anything you add here by hand will be overwritten by that command — keep
 * derived and helper types in `src/index.ts` instead.
 *
 * Note: `location` columns are PostGIS `geography(Point,4326)` and are GENERATED
 * ALWAYS from lat/lng, so they are read-only and typed `unknown`.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          display_name: string | null
          avatar_url: string | null
          bio: string | null
          home_country: string | null
          certifications: Json
          preferences: Json
          total_dives: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          home_country?: string | null
          certifications?: Json
          preferences?: Json
          total_dives?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          home_country?: string | null
          certifications?: Json
          preferences?: Json
          total_dives?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'users_id_fkey'
            columns: ['id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      dive_sites: {
        Row: {
          id: string
          slug: string
          name: string
          description: string | null
          insider_notes: string | null
          type: Database['public']['Enums']['site_type']
          level: Database['public']['Enums']['dive_level'] | null
          lat: number
          lng: number
          location: unknown | null
          country: string
          region: string | null
          depth_min_m: number
          depth_max_m: number
          viz_score: number | null
          current_level: Database['public']['Enums']['current_level'] | null
          avg_temp_c: number | null
          rating: number | null
          hero_photo_url: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          description?: string | null
          insider_notes?: string | null
          type: Database['public']['Enums']['site_type']
          level?: Database['public']['Enums']['dive_level'] | null
          lat: number
          lng: number
          country: string
          region?: string | null
          depth_min_m: number
          depth_max_m: number
          viz_score?: number | null
          current_level?: Database['public']['Enums']['current_level'] | null
          avg_temp_c?: number | null
          rating?: number | null
          hero_photo_url?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          description?: string | null
          insider_notes?: string | null
          type?: Database['public']['Enums']['site_type']
          level?: Database['public']['Enums']['dive_level'] | null
          lat?: number
          lng?: number
          country?: string
          region?: string | null
          depth_min_m?: number
          depth_max_m?: number
          viz_score?: number | null
          current_level?: Database['public']['Enums']['current_level'] | null
          avg_temp_c?: number | null
          rating?: number | null
          hero_photo_url?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'dive_sites_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      operators: {
        Row: {
          id: string
          slug: string
          name: string
          description: string | null
          base: string | null
          country: string
          lat: number | null
          lng: number | null
          location: unknown | null
          tech_certified: boolean
          certs_offered: string[]
          rating: number | null
          tech_dives_guided: number
          website: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          description?: string | null
          base?: string | null
          country: string
          lat?: number | null
          lng?: number | null
          tech_certified?: boolean
          certs_offered?: string[]
          rating?: number | null
          tech_dives_guided?: number
          website?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          description?: string | null
          base?: string | null
          country?: string
          lat?: number | null
          lng?: number | null
          tech_certified?: boolean
          certs_offered?: string[]
          rating?: number | null
          tech_dives_guided?: number
          website?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'operators_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      operator_sites: {
        Row: {
          operator_id: string
          site_id: string
        }
        Insert: {
          operator_id: string
          site_id: string
        }
        Update: {
          operator_id?: string
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'operator_sites_operator_id_fkey'
            columns: ['operator_id']
            isOneToOne: false
            referencedRelation: 'operators'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'operator_sites_site_id_fkey'
            columns: ['site_id']
            isOneToOne: false
            referencedRelation: 'dive_sites'
            referencedColumns: ['id']
          },
        ]
      }
      species: {
        Row: {
          id: string
          slug: string
          common_name: string
          scientific_name: string | null
          color: string | null
          thumbnail_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          slug: string
          common_name: string
          scientific_name?: string | null
          color?: string | null
          thumbnail_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          slug?: string
          common_name?: string
          scientific_name?: string | null
          color?: string | null
          thumbnail_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      dives: {
        Row: {
          id: string
          user_id: string
          site_id: string | null
          dived_at: string
          max_depth_m: number
          avg_depth_m: number | null
          bottom_time_min: number
          runtime_min: number | null
          gas_o2: number | null
          gas_he: number | null
          viz_m: number | null
          current_level: Database['public']['Enums']['current_level'] | null
          temp_surface_c: number | null
          temp_bottom_c: number | null
          weight_kg: number | null
          buddy: string | null
          notes: string | null
          rating: number | null
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          site_id?: string | null
          dived_at: string
          max_depth_m: number
          avg_depth_m?: number | null
          bottom_time_min: number
          runtime_min?: number | null
          gas_o2?: number | null
          gas_he?: number | null
          viz_m?: number | null
          current_level?: Database['public']['Enums']['current_level'] | null
          temp_surface_c?: number | null
          temp_bottom_c?: number | null
          weight_kg?: number | null
          buddy?: string | null
          notes?: string | null
          rating?: number | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          site_id?: string | null
          dived_at?: string
          max_depth_m?: number
          avg_depth_m?: number | null
          bottom_time_min?: number
          runtime_min?: number | null
          gas_o2?: number | null
          gas_he?: number | null
          viz_m?: number | null
          current_level?: Database['public']['Enums']['current_level'] | null
          temp_surface_c?: number | null
          temp_bottom_c?: number | null
          weight_kg?: number | null
          buddy?: string | null
          notes?: string | null
          rating?: number | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'dives_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'dives_site_id_fkey'
            columns: ['site_id']
            isOneToOne: false
            referencedRelation: 'dive_sites'
            referencedColumns: ['id']
          },
        ]
      }
      conditions_reports: {
        Row: {
          id: string
          site_id: string
          reporter: string
          viz_m: number
          current_level: Database['public']['Enums']['current_level']
          temp_surface_c: number | null
          temp_bottom_c: number | null
          notes: string | null
          reported_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          site_id: string
          reporter: string
          viz_m: number
          current_level: Database['public']['Enums']['current_level']
          temp_surface_c?: number | null
          temp_bottom_c?: number | null
          notes?: string | null
          reported_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          site_id?: string
          reporter?: string
          viz_m?: number
          current_level?: Database['public']['Enums']['current_level']
          temp_surface_c?: number | null
          temp_bottom_c?: number | null
          notes?: string | null
          reported_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'conditions_reports_site_id_fkey'
            columns: ['site_id']
            isOneToOne: false
            referencedRelation: 'dive_sites'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'conditions_reports_reporter_fkey'
            columns: ['reporter']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      dive_reviews: {
        Row: {
          id: string
          site_id: string
          user_id: string
          rating: number
          viz_rating: number | null
          current_rating: number | null
          marine_life_rating: number | null
          body: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          site_id: string
          user_id: string
          rating: number
          viz_rating?: number | null
          current_rating?: number | null
          marine_life_rating?: number | null
          body?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          site_id?: string
          user_id?: string
          rating?: number
          viz_rating?: number | null
          current_rating?: number | null
          marine_life_rating?: number | null
          body?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'dive_reviews_site_id_fkey'
            columns: ['site_id']
            isOneToOne: false
            referencedRelation: 'dive_sites'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'dive_reviews_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      site_photos: {
        Row: {
          id: string
          site_id: string
          user_id: string
          dive_id: string | null
          url: string
          caption: string | null
          depth_taken_m: number | null
          species_tagged: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          site_id: string
          user_id: string
          dive_id?: string | null
          url: string
          caption?: string | null
          depth_taken_m?: number | null
          species_tagged?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          site_id?: string
          user_id?: string
          dive_id?: string | null
          url?: string
          caption?: string | null
          depth_taken_m?: number | null
          species_tagged?: string[]
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'site_photos_site_id_fkey'
            columns: ['site_id']
            isOneToOne: false
            referencedRelation: 'dive_sites'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'site_photos_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'site_photos_dive_id_fkey'
            columns: ['dive_id']
            isOneToOne: false
            referencedRelation: 'dives'
            referencedColumns: ['id']
          },
        ]
      }
      species_sightings: {
        Row: {
          id: string
          species_id: string
          site_id: string
          dive_id: string | null
          user_id: string
          depth_m: number | null
          photo_url: string | null
          sighted_at: string
          created_at: string
        }
        Insert: {
          id?: string
          species_id: string
          site_id: string
          dive_id?: string | null
          user_id: string
          depth_m?: number | null
          photo_url?: string | null
          sighted_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          species_id?: string
          site_id?: string
          dive_id?: string | null
          user_id?: string
          depth_m?: number | null
          photo_url?: string | null
          sighted_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'species_sightings_species_id_fkey'
            columns: ['species_id']
            isOneToOne: false
            referencedRelation: 'species'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'species_sightings_site_id_fkey'
            columns: ['site_id']
            isOneToOne: false
            referencedRelation: 'dive_sites'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'species_sightings_dive_id_fkey'
            columns: ['dive_id']
            isOneToOne: false
            referencedRelation: 'dives'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'species_sightings_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      wishlists: {
        Row: {
          id: string
          user_id: string
          site_id: string
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          site_id: string
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          site_id?: string
          note?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'wishlists_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'wishlists_site_id_fkey'
            columns: ['site_id']
            isOneToOne: false
            referencedRelation: 'dive_sites'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      dive_sites_near: {
        Args: {
          in_lat: number
          in_lng: number
          radius_m?: number
          max_results?: number
        }
        Returns: {
          id: string
          slug: string
          name: string
          type: Database['public']['Enums']['site_type']
          country: string
          lat: number
          lng: number
          depth_min_m: number
          depth_max_m: number
          viz_score: number | null
          current_level: Database['public']['Enums']['current_level'] | null
          rating: number | null
          hero_photo_url: string | null
          distance_m: number
        }[]
      }
    }
    Enums: {
      site_type:
        | 'reef'
        | 'wreck'
        | 'wall'
        | 'cave'
        | 'cenote'
        | 'drift'
        | 'muck'
        | 'pinnacle'
        | 'kelp'
        | 'fissure'
      current_level: 'none' | 'mild' | 'moderate' | 'strong' | 'ripping'
      dive_level: 'beginner' | 'intermediate' | 'advanced' | 'technical'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

type PublicSchema = Database['public']

/** Row type for a table, e.g. `Tables<'dive_sites'>`. */
export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row']

/** Insert type for a table, e.g. `TablesInsert<'dives'>`. */
export type TablesInsert<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Insert']

/** Update type for a table, e.g. `TablesUpdate<'dives'>`. */
export type TablesUpdate<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Update']

/** Enum union, e.g. `Enums<'current_level'>`. */
export type Enums<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T]
