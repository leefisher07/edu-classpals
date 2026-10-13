// Type definitions for dashboard components
// These types match the real API response shape

export interface Student {
  id: string
  name: string
  studentNumber?: string
  studentNo?: string // alias
  gender?: 'male' | 'female'
  groupId?: string
  totalPoints: number
  availablePoints: number
  avatarColor?: string   // CSS class (design compat)
  avatarBgColor?: string // hex color (real API)
}

export interface Group {
  id: string
  name: string
  leaderId?: string | null
  leaderIds?: string[]
  members?: string[]
  memberIds?: string[]
  totalPoints: number
  availablePoints?: number
}

export interface PointRule {
  id: string
  name: string
  value: number
  type: 'add' | 'deduct'
  category?: string
}

export interface ShopItem {
  id: string
  name: string
  description?: string
  cost: number
  pointCost?: number
  stock?: number
  image?: string
}

// Avatar color palette — assigned by index
const avatarColors = [
  'bg-red-100 text-red-600',
  'bg-orange-100 text-orange-600',
  'bg-amber-100 text-amber-600',
  'bg-yellow-100 text-yellow-600',
  'bg-lime-100 text-lime-600',
  'bg-green-100 text-green-600',
  'bg-emerald-100 text-emerald-600',
  'bg-teal-100 text-teal-600',
  'bg-cyan-100 text-cyan-600',
  'bg-sky-100 text-sky-600',
  'bg-blue-100 text-blue-600',
  'bg-indigo-100 text-indigo-600',
  'bg-violet-100 text-violet-600',
  'bg-purple-100 text-purple-600',
  'bg-fuchsia-100 text-fuchsia-600',
  'bg-pink-100 text-pink-600',
  'bg-rose-100 text-rose-600',
]

export function getAvatarColor(index: number): string {
  return avatarColors[index % avatarColors.length]
}

export function getSurname(name: string): string {
  return name?.charAt(0) || '?'
}

// Empty exports for backwards compat — pages use real API data
export const mockStudents: Student[] = []
export const mockGroups: Group[] = []
export const mockAddRules: PointRule[] = []
export const mockDeductRules: PointRule[] = []
