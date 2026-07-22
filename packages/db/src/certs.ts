/**
 * Predefined certification catalog (task 7.2) and gear categories.
 *
 * Users pick from this list rather than free-typing, so badges stay
 * consistent across profiles and reviews. Deliberately not exhaustive —
 * the common recreational ladder plus the tech/freediving certs the
 * personas actually hold. Extend here, never inline in a screen.
 */

import type { Certification } from './index'

export type CatalogCert = Omit<Certification, 'year'>

export const CERT_CATALOG: ReadonlyArray<{ agency: string; certs: CatalogCert[] }> = [
  {
    agency: 'PADI',
    certs: [
      { abbr: 'OW', name: 'Open Water Diver', org: 'PADI' },
      { abbr: 'AOW', name: 'Advanced Open Water', org: 'PADI' },
      { abbr: 'RES', name: 'Rescue Diver', org: 'PADI' },
      { abbr: 'DM', name: 'Divemaster', org: 'PADI' },
      { abbr: 'T40', name: 'Tec 40', org: 'PADI TecRec' },
      { abbr: 'T45', name: 'Tec 45', org: 'PADI TecRec' },
      { abbr: 'T50', name: 'Tec 50', org: 'PADI TecRec' },
    ],
  },
  {
    agency: 'SSI',
    certs: [
      { abbr: 'OWD', name: 'Open Water Diver', org: 'SSI' },
      { abbr: 'AA', name: 'Advanced Adventurer', org: 'SSI' },
      { abbr: 'DG', name: 'Dive Guide', org: 'SSI' },
      { abbr: 'XR', name: 'Extended Range', org: 'SSI XR' },
    ],
  },
  {
    agency: 'TDI',
    certs: [
      { abbr: 'AN', name: 'Advanced Nitrox', org: 'TDI' },
      { abbr: 'DP', name: 'Decompression Procedures', org: 'TDI' },
      { abbr: 'ER', name: 'Extended Range', org: 'TDI' },
      { abbr: 'TX', name: 'Trimix', org: 'TDI' },
      { abbr: 'ATX', name: 'Advanced Trimix', org: 'TDI' },
    ],
  },
  {
    agency: 'GUE',
    certs: [
      { abbr: 'FND', name: 'Fundamentals', org: 'GUE' },
      { abbr: 'T1', name: 'Tech 1', org: 'GUE' },
      { abbr: 'T2', name: 'Tech 2', org: 'GUE' },
    ],
  },
  {
    agency: 'CMAS',
    certs: [
      { abbr: '1★', name: 'One Star Diver', org: 'CMAS' },
      { abbr: '2★', name: 'Two Star Diver', org: 'CMAS' },
      { abbr: '3★', name: 'Three Star Diver', org: 'CMAS' },
    ],
  },
  {
    agency: 'Freediving',
    certs: [
      { abbr: 'A2', name: 'AIDA 2', org: 'AIDA' },
      { abbr: 'A3', name: 'AIDA 3', org: 'AIDA' },
      { abbr: 'A4', name: 'AIDA 4', org: 'AIDA' },
      { abbr: 'ML1', name: 'Molchanovs Wave 1', org: 'Molchanovs' },
      { abbr: 'ML2', name: 'Molchanovs Wave 2', org: 'Molchanovs' },
    ],
  },
]

/** One piece of diver equipment on the profile. */
export interface GearItem {
  /** One of GEAR_CATEGORIES, kept as a string for forward-compat. */
  category: string
  /** Free-form brand/model, e.g. 'Shearwater Perdix 2'. */
  name: string
}

export const GEAR_CATEGORIES = [
  'Computer',
  'Regulator',
  'BCD / Wing',
  'Suit',
  'Fins',
  'Mask',
  'Camera',
  'Other',
] as const
