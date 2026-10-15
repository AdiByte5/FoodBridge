export type Role = 'DONOR' | 'RECIPIENT' | 'VOLUNTEER' | 'ADMIN'
export type AccountStatus = 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED'

export interface UserProfile {
  userId: number
  fullName: string
  email: string
  phoneNumber?: string | null
  role: Role
  accountStatus: AccountStatus
  createdAt?: string | null
  lastLogin?: string | null
  organizationId?: number | null
  organizationName?: string | null
  organizationType?: string | null
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  verified?: boolean | null
  storageCapacityKg?: number | null
  currentLoadKg?: number | null
  demandKg?: number | null
  beneficiaries?: number | null
  vehicleType?: string | null
  availabilityStatus?: string | null
  currentLocation?: string | null
  completedDeliveries?: number | null
  activeDeliveries?: number | null
}

export interface AuthResponse {
  token: string
  expiresInMinutes: number
  user: UserProfile
}

export interface RegisterPayload {
  fullName: string
  email: string
  password: string
  phoneNumber?: string
  role: Role
  organizationName?: string
  organizationType?: string
  address?: string
  vehicleType?: string
  storageCapacityKg?: number
  demandKg?: number
  beneficiaries?: number
}

export type DonationStatus = 'PENDING' | 'ALLOCATED' | 'PICKED_UP' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED'
export type AllocationStatus = 'PROPOSED' | 'ACCEPTED' | 'REJECTED' | 'SUPERSEDED' | 'COMPLETED'
export type AssignmentStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'COMPLETED'
export type DeliveryStatus = 'PENDING' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED'

export interface FactorScore {
  key: string
  label: string
  score: number
  weight: number
  contribution: number
  detail: string
}

export interface RecipientCandidate {
  recipientId: number
  organizationName: string
  organizationType?: string | null
  address?: string | null
  distanceKm?: number | null
  freeCapacityKg?: number | null
  demandKg?: number | null
  preferenceMatch: boolean
  allocationsLast30Days: number
  receivedLast30DaysKg: number
  totalScore: number
  factors: FactorScore[]
  explanation: string
  excluded: boolean
  exclusionReason?: string | null
}

export interface EngineWeight {
  key: string
  label: string
  weight: number
  description: string
}

export interface Recommendation {
  donationId: number
  foodName: string
  quantity: number
  unit: string
  categoryName: string
  hoursToExpiry: number
  evaluatedAt: string
  eligibleCount: number
  excludedCount: number
  ranked: RecipientCandidate[]
  recommended?: RecipientCandidate | null
  summary: string
  appliedFilters: string[]
  weights: EngineWeight[]
}

export interface Donation {
  donationId: number
  foodName: string
  categoryId?: number | null
  categoryName: string
  quantity: number
  unit: string
  expiryTime: string
  hoursToExpiry: number
  pickupAddress?: string | null
  pickupStart?: string | null
  pickupEnd?: string | null
  storageRequirement?: string | null
  status: DonationStatus
  createdAt: string
  notes?: string | null
  donorId: number
  donorName: string
  donorType?: string | null
  allocationId?: number | null
  allocationStatus?: AllocationStatus | null
  priorityScore?: number | null
  recipientId?: number | null
  recipientName?: string | null
  decisionExplanation?: string | null
  volunteerName?: string | null
  assignmentStatus?: AssignmentStatus | null
  deliveryStatus?: DeliveryStatus | null
}

export interface AllocationView {
  allocationId: number
  donationId: number
  foodName: string
  categoryName: string
  quantity: number
  unit: string
  storageRequirement?: string | null
  donorName: string
  pickupAddress?: string | null
  pickupWindow?: string | null
  distanceKm?: number | null
  hoursToExpiry?: number | null
  priorityScore?: number | null
  decisionExplanation?: string | null
  factorBreakdown: FactorScore[]
  allocationTime: string
  allocationStatus: AllocationStatus
  recipientId: number
  recipientName: string
  recipientAddress?: string | null
  assignmentId?: number | null
  assignmentStatus?: AssignmentStatus | null
  volunteerName?: string | null
  volunteerPhone?: string | null
  deliveryId?: number | null
  deliveryStatus?: DeliveryStatus | null
  pickupTime?: string | null
  deliveryTime?: string | null
}

export interface Assignment {
  assignmentId: number
  allocationId: number
  donationId: number
  foodName: string
  categoryName: string
  quantity: number
  unit: string
  storageRequirement?: string | null
  donorName: string
  pickupAddress?: string | null
  pickupLatitude?: number | null
  pickupLongitude?: number | null
  pickupWindow?: string | null
  recipientName: string
  recipientAddress?: string | null
  recipientLatitude?: number | null
  recipientLongitude?: number | null
  expiryTime?: string | null
  hoursToExpiry?: number | null
  matchScore?: number | null
  matchExplanation?: string | null
  assignedTime: string
  assignmentStatus: AssignmentStatus
  deliveryId?: number | null
  deliveryStatus?: DeliveryStatus | null
  pickupTime?: string | null
  deliveryTime?: string | null
  distanceKm?: number | null
  route?: string | null
}

export interface Recipient {
  recipientId: number
  organizationName: string
  organizationType?: string | null
  address?: string | null
  email?: string | null
  phoneNumber?: string | null
  storageCapacityKg?: number | null
  currentLoadKg?: number | null
  freeCapacityKg?: number | null
  demandKg?: number | null
  beneficiaries?: number | null
  latitude?: number | null
  longitude?: number | null
  verified: boolean
  preferences: string[]
}

export interface Volunteer {
  volunteerId: number
  name: string
  email: string
  phoneNumber?: string | null
  vehicleType?: string | null
  availabilityStatus: 'AVAILABLE' | 'BUSY' | 'OFFLINE'
  currentLocation?: string | null
  latitude?: number | null
  longitude?: number | null
  completedDeliveries?: number | null
  activeDeliveries?: number | null
}

export interface VolunteerCandidate {
  volunteerId: number
  name: string
  vehicleType?: string | null
  availabilityStatus: string
  distanceKm?: number | null
  activeDeliveries: number
  completedDeliveries: number
  matchScore: number
  explanation: string
}

export interface NotificationItem {
  notificationId: number
  title: string
  message: string
  notificationType: string
  isRead: boolean
  createdAt: string
}

export interface CategoryView {
  categoryId: number
  categoryName: string
  recommendedStorage?: string | null
  shelfLifeHours?: number | null
}

export interface TrendPoint {
  date: string
  label: string
  donations: number
  kgRescued: number
  completed: number
}

export interface Slice {
  name: string
  value: number
  kg: number
}

export interface FairnessPoint {
  organizationName: string
  kgReceived: number
  allocations: number
}

export interface LeaderboardRow {
  name: string
  completedDeliveries: number
  activeDeliveries: number
  vehicleType?: string | null
}

export interface ActivityItem {
  timestamp: string
  module: string
  action: string
  description: string
  actor: string
}

export interface AnalyticsOverview {
  totalDonations: number
  activeDonations: number
  completedDonations: number
  cancelledDonations: number
  totalKgRescued: number
  estimatedMeals: number
  activeVolunteers: number
  totalVolunteers: number
  verifiedOrganizations: number
  totalRecipients: number
  allocationsTotal: number
  allocationsAccepted: number
  allocationAcceptanceRate: number
  avgDeliveryHours: number
  expiringSoon: number
  avgPriorityScore: number
  pendingVerifications: number
  usersByRole: Record<string, number>
}

export interface Analytics {
  overview: AnalyticsOverview
  donationTrend: TrendPoint[]
  categoryDistribution: Slice[]
  statusFunnel: Slice[]
  fairness: FairnessPoint[]
  volunteerLeaderboard: LeaderboardRow[]
  recentActivity: ActivityItem[]
  engineWeights: EngineWeight[]
}

export interface AdminUser {
  userId: number
  fullName: string
  email: string
  phoneNumber?: string | null
  role: Role
  accountStatus: AccountStatus
  verified?: boolean | null
  organizationName?: string | null
  organizationType?: string | null
  createdAt?: string | null
  lastLogin?: string | null
}

export interface AuditLogEntry {
  logId: number
  actor: string
  module: string
  action: string
  timestamp: string
  description: string
}

export interface SystemHealth {
  status: string
  database: string
  uptimeSeconds: number
  applicationVersion: string
  entityCounts: Record<string, number>
  activeComponents: string[]
}

export interface PlatformStats {
  donations: number
  recipientOrganizations: number
  verifiedOrganizations: number
  volunteers: number
  kgRescued: number
}
