export interface PartnerPlace {
  id: string
  name: string
  category: 'coffee' | 'food' | 'rest'
  address: string
  latitude: number | null
  longitude: number | null
  description: string
  status: 'candidate' | 'partner'
  offer: string
  website: string | null
  is_active: boolean
}

export interface MapLocation { latitude: number; longitude: number }
