export interface Student {
  id: string
  name: string
  age: number
  grade: string
  photoUrl?: string
  emergencyContacts: EmergencyContact[]
  supportNeeds: string[]
  careNotes: string
  iepGoals: IEPGoal[]
  createdAt: string
}

export interface EmergencyContact {
  id: string
  name: string
  relationship: string
  phone: string
  isPrimary: boolean
}

export interface IEPGoal {
  id: string
  title: string
  description: string
  targetDate: string
  progress: number
  category: 'academic' | 'behavioral' | 'social' | 'communication'
}

export interface BehaviorLog {
  id: string
  studentId: string
  timestamp: string
  type: 'positive' | 'challenging' | 'neutral'
  severity: 1 | 2 | 3 | 4 | 5
  trigger?: string
  behavior: string
  intervention: string
  outcome: string
  notes?: string
  // Enhanced tracking fields
  sessionId: string
  recordedBy: string // User ID of who recorded the behavior
  duration?: number // Duration of behavior in minutes
  location: string
  antecedent?: string // What happened before the behavior
  consequence?: string // What happened after the behavior
  interventionEffectiveness: 1 | 2 | 3 | 4 | 5 // How effective was the intervention
  followUpRequired: boolean
  followUpCompleted?: boolean
  attachments?: Attachment[]
  tags: string[]
  environmentalFactors?: string[]
  status: 'draft' | 'submitted' | 'reviewed' | 'approved'
}

export interface ActivityLog {
  id: string
  studentId: string
  timestamp: string
  type: 'meal' | 'medication' | 'bathroom' | 'therapy' | 'academic' | 'break' | 'sensory' | 'social' | 'transition'
  details: string
  notes?: string
  // Enhanced tracking fields
  sessionId: string
  recordedBy: string // User ID of who recorded the activity
  startTime: string
  endTime?: string
  duration?: number // Duration in minutes
  location: string
  participantIds?: string[] // Other students or staff involved
  success: boolean
  objectives?: string[] // What was the goal of this activity
  adaptationsUsed?: string[] // Any modifications made
  studentResponse: 'positive' | 'neutral' | 'negative' | 'mixed'
  engagementLevel: 1 | 2 | 3 | 4 | 5
  supportLevel: 'independent' | 'minimal' | 'moderate' | 'maximum'
  equipmentUsed?: string[]
  attachments?: Attachment[]
  followUpActions?: string[]
  status: 'in-progress' | 'completed' | 'cancelled' | 'postponed'
  nextScheduled?: string
}

export interface Message {
  id: string
  studentId?: string
  from: string
  to: string[]
  subject: string
  content: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  timestamp: string
  read: boolean
  type: 'general' | 'incident' | 'progress' | 'health' | 'behavior' | 'academic' | 'safety'
  // Enhanced tracking fields
  sessionId: string
  sentTimestamp: string
  deliveredTimestamp?: string
  readTimestamp?: string
  status: 'draft' | 'sent' | 'delivered' | 'read' | 'failed'
  messageThread?: string // ID of the conversation thread
  replyToId?: string // ID of message this is replying to
  attachments?: Attachment[]
  recipients: MessageRecipient[]
  confidential: boolean
  requiresResponse: boolean
  responseDeadline?: string
  responseReceived?: boolean
  tags: string[]
  deviceInfo?: DeviceInfo
  location?: string
  encryption: boolean
  forwardedFrom?: string
  editHistory?: MessageEdit[]
  importance: 1 | 2 | 3 | 4 | 5
}

export interface CrisisProtocol {
  id: string
  studentId: string
  triggerSigns: string[]
  deEscalationSteps: string[]
  emergencyProcedure: string
  lastUpdated: string
}

// Supporting interfaces for enhanced logging
export interface Attachment {
  id: string
  filename: string
  type: 'image' | 'video' | 'audio' | 'document'
  url: string
  size: number
  uploadedAt: string
  uploadedBy: string
}

export interface MessageRecipient {
  userId: string
  name: string
  role: string
  deliveredAt?: string
  readAt?: string
  status: 'pending' | 'delivered' | 'read' | 'failed'
}

export interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop'
  os: string
  browser?: string
  userAgent: string
}

export interface MessageEdit {
  timestamp: string
  editedBy: string
  previousContent: string
  reason?: string
}

export interface UserSession {
  id: string
  userId: string
  startTime: string
  endTime?: string
  duration?: number
  deviceInfo: DeviceInfo
  location?: string
  activities: UserActivity[]
  status: 'active' | 'ended' | 'timeout'
}

export interface UserActivity {
  id: string
  sessionId: string
  timestamp: string
  action: string
  target?: string
  details?: Record<string, any>
  duration?: number
  success: boolean
  errorMessage?: string
}

export interface SystemLog {
  id: string
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  category: 'user-action' | 'system-event' | 'security' | 'performance'
  message: string
  userId?: string
  sessionId?: string
  details?: Record<string, any>
  source: string
}

export interface UserFeedback {
  id: string
  userId: string
  timestamp: string
  type: 'bug' | 'feature-request' | 'general' | 'rating'
  content: string
  rating?: 1 | 2 | 3 | 4 | 5
  category?: string
  status: 'new' | 'in-review' | 'resolved' | 'closed'
  attachments?: Attachment[]
}