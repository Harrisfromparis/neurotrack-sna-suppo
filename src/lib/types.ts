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
}

export interface ActivityLog {
  id: string
  studentId: string
  timestamp: string
  type: 'meal' | 'medication' | 'bathroom' | 'therapy' | 'academic' | 'break'
  details: string
  notes?: string
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
  type: 'general' | 'incident' | 'progress' | 'health'
}

export interface CrisisProtocol {
  id: string
  studentId: string
  triggerSigns: string[]
  deEscalationSteps: string[]
  emergencyProcedure: string
  lastUpdated: string
}