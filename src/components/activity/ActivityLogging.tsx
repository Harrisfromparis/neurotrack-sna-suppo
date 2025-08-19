import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Student, ActivityLog } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Activity, Clock, Users, CheckCircle, XCircle, Play, Pause, StopCircle } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useLogging, useFormTracking } from '@/hooks/useLogging'
import { getCurrentSessionId } from '@/lib/logging'

interface ActivityLoggingProps {
  students: Student[]
  selectedStudentId: string
  onSelectStudent: (id: string) => void
}

export function ActivityLogging({ students, selectedStudentId, onSelectStudent }: ActivityLoggingProps) {
  const [activityLogs, setActivityLogs] = useKV<ActivityLog[]>('activity-logs', [])
  const [showAddLog, setShowAddLog] = useState(false)
  const [activeActivities, setActiveActivities] = useKV<Record<string, ActivityLog>>('active-activities', {})
  const { logAction, logError } = useLogging()
  const { trackFormStart, trackFieldInteraction, trackFormSubmit, trackValidationError } = useFormTracking('activity-log-form')
  
  const [newActivity, setNewActivity] = useState({
    studentId: '',
    type: 'academic' as 'meal' | 'medication' | 'bathroom' | 'therapy' | 'academic' | 'break' | 'sensory' | 'social' | 'transition',
    details: '',
    notes: '',
    location: '',
    participantIds: [] as string[],
    objectives: [] as string[],
    adaptationsUsed: [] as string[],
    studentResponse: 'neutral' as 'positive' | 'neutral' | 'negative' | 'mixed',
    engagementLevel: 3 as 1 | 2 | 3 | 4 | 5,
    supportLevel: 'moderate' as 'independent' | 'minimal' | 'moderate' | 'maximum',
    equipmentUsed: [] as string[],
    followUpActions: [] as string[]
  })

  const selectedStudent = students.find(s => s.id === selectedStudentId)
  const studentLogs = activityLogs.filter(log => log.studentId === selectedStudentId)

  // Common options for dropdowns
  const activityObjectives = [
    'communication-skills', 'social-interaction', 'academic-progress', 'motor-skills',
    'self-regulation', 'attention-focus', 'following-directions', 'independence',
    'peer-interaction', 'emotional-regulation'
  ]

  const adaptationOptions = [
    'visual-supports', 'reduced-stimuli', 'extra-time', 'broken-down-tasks',
    'movement-breaks', 'alternative-seating', 'modified-materials', 'verbal-prompts',
    'physical-assistance', 'peer-support'
  ]

  const equipmentOptions = [
    'tablet', 'communication-device', 'sensory-tools', 'fidget-items',
    'noise-canceling-headphones', 'weighted-items', 'visual-schedule',
    'timer', 'adaptive-seating', 'assistive-technology'
  ]

  const followUpOptions = [
    'parent-communication', 'teacher-update', 'iep-team-meeting', 'behavior-plan-review',
    'equipment-adjustment', 'strategy-modification', 'additional-support', 'medical-consultation'
  ]

  // Update form when student changes
  useEffect(() => {
    setNewActivity(prev => ({
      ...prev,
      studentId: selectedStudentId || ''
    }))
  }, [selectedStudentId])

  // Log component usage
  useEffect(() => {
    logAction('view_activity_logging', selectedStudentId || 'no_student_selected')
  }, [selectedStudentId, logAction])

  const handleStartActivity = async () => {
    if (!newActivity.studentId || !newActivity.details) {
      toast.error('Please select a student and add activity details')
      return
    }

    try {
      const sessionId = getCurrentSessionId() || 'no-session'
      const currentUser = await spark.user()
      const startTime = new Date().toISOString()
      
      const activity: ActivityLog = {
        id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        ...newActivity,
        timestamp: startTime,
        sessionId,
        recordedBy: currentUser?.login || 'unknown-user',
        startTime,
        success: true, // Will be updated when activity ends
        status: 'in-progress'
      }

      // Add to active activities
      setActiveActivities(current => ({
        ...current,
        [activity.id]: activity
      }))

      logAction('activity_started', selectedStudentId, {
        activityType: activity.type,
        location: activity.location,
        supportLevel: activity.supportLevel,
        hasObjectives: activity.objectives.length > 0
      })

      toast.success('Activity started and being tracked')
      
      setShowAddLog(false)
    } catch (error) {
      logError('activity_start', error?.toString() || 'Unknown error', selectedStudentId)
      toast.error('Failed to start activity')
    }
  }

  const handleEndActivity = async (activityId: string, success: boolean = true) => {
    const activity = activeActivities[activityId]
    if (!activity) return

    try {
      const endTime = new Date().toISOString()
      const duration = Math.round((new Date(endTime).getTime() - new Date(activity.startTime).getTime()) / 1000 / 60) // minutes

      const completedActivity: ActivityLog = {
        ...activity,
        endTime,
        duration,
        success,
        status: success ? 'completed' : 'cancelled'
      }

      // Add to permanent logs
      setActivityLogs(current => [...current, completedActivity])
      
      // Remove from active activities
      setActiveActivities(current => {
        const updated = { ...current }
        delete updated[activityId]
        return updated
      })

      logAction('activity_ended', selectedStudentId, {
        activityType: activity.type,
        duration,
        success,
        engagementLevel: activity.engagementLevel
      })

      toast.success(`Activity ${success ? 'completed' : 'cancelled'}`)
    } catch (error) {
      logError('activity_end', error?.toString() || 'Unknown error', selectedStudentId)
      toast.error('Failed to end activity')
    }
  }

  const handleLogCompletedActivity = async () => {
    trackFormStart()
    
    // Validation
    if (!newActivity.studentId || !newActivity.details) {
      const missingFields = []
      if (!newActivity.studentId) missingFields.push('student')
      if (!newActivity.details) missingFields.push('details')
      
      trackValidationError('required-fields', `Missing: ${missingFields.join(', ')}`)
      toast.error('Please fill in required fields')
      return
    }

    try {
      const sessionId = getCurrentSessionId() || 'no-session'
      const currentUser = await spark.user()
      const timestamp = new Date().toISOString()
      
      const activity: ActivityLog = {
        id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        ...newActivity,
        timestamp,
        sessionId,
        recordedBy: currentUser?.login || 'unknown-user',
        startTime: timestamp,
        endTime: timestamp,
        success: newActivity.studentResponse === 'positive',
        status: 'completed'
      }

      setActivityLogs(current => [...current, activity])
      
      logAction('activity_logged', selectedStudentId, {
        activityType: activity.type,
        studentResponse: activity.studentResponse,
        engagementLevel: activity.engagementLevel,
        supportLevel: activity.supportLevel,
        hasAdaptations: activity.adaptationsUsed.length > 0
      })
      
      trackFormSubmit({
        activityType: activity.type,
        studentResponse: activity.studentResponse,
        supportLevel: activity.supportLevel
      }, true)
      
      toast.success('Activity logged successfully')
      
      // Reset form
      setNewActivity({
        studentId: selectedStudentId || '',
        type: 'academic',
        details: '',
        notes: '',
        location: '',
        participantIds: [],
        objectives: [],
        adaptationsUsed: [],
        studentResponse: 'neutral',
        engagementLevel: 3,
        supportLevel: 'moderate',
        equipmentUsed: [],
        followUpActions: []
      })
      setShowAddLog(false)
    } catch (error) {
      logError('activity_logging', error?.toString() || 'Unknown error', selectedStudentId)
      trackFormSubmit({}, false)
      toast.error('Failed to log activity')
    }
  }

  const getResponseColor = (response: string) => {
    switch (response) {
      case 'positive': return 'bg-green-100 text-green-800'
      case 'negative': return 'bg-red-100 text-red-800'
      case 'mixed': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getSupportLevelColor = (level: string) => {
    switch (level) {
      case 'independent': return 'bg-green-100 text-green-800'
      case 'minimal': return 'bg-blue-100 text-blue-800'
      case 'moderate': return 'bg-yellow-100 text-yellow-800'
      case 'maximum': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTodayStats = () => {
    const today = new Date().toDateString()
    const todayLogs = studentLogs.filter(log => 
      new Date(log.timestamp).toDateString() === today
    )
    
    return {
      total: todayLogs.length,
      successful: todayLogs.filter(log => log.success).length,
      positive: todayLogs.filter(log => log.studentResponse === 'positive').length,
      averageEngagement: todayLogs.length > 0 ? 
        todayLogs.reduce((sum, log) => sum + log.engagementLevel, 0) / todayLogs.length : 0
    }
  }

  if (!selectedStudent) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold mb-2">Activity Logging</h2>
          <p className="text-muted-foreground">Select a student to track their daily activities</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {students.map((student) => (
            <Card 
              key={student.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onSelectStudent(student.id)}
            >
              <CardHeader>
                <CardTitle className="text-lg">{student.name}</CardTitle>
                <CardDescription>Age {student.age} • {student.grade}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  {activityLogs.filter(log => log.studentId === student.id).length} total activities
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const todayStats = getTodayStats()
  const activeStudentActivities = Object.values(activeActivities).filter(a => a.studentId === selectedStudentId)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">{selectedStudent.name} - Activity Logging</h2>
          <p className="text-muted-foreground">Track daily activities, progress, and engagement</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onSelectStudent('')}>
            Back to Students
          </Button>
          <Dialog open={showAddLog} onOpenChange={setShowAddLog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Log Activity
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Log Activity</DialogTitle>
                <DialogDescription>
                  Record comprehensive activity information for {selectedStudent.name}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Activity Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Activity Type *</Label>
                      <Select 
                        onValueChange={(value: any) => {
                          setNewActivity(prev => ({ ...prev, type: value }))
                          trackFieldInteraction('type')
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select activity type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="meal">Meal</SelectItem>
                          <SelectItem value="medication">Medication</SelectItem>
                          <SelectItem value="bathroom">Bathroom</SelectItem>
                          <SelectItem value="therapy">Therapy</SelectItem>
                          <SelectItem value="academic">Academic</SelectItem>
                          <SelectItem value="break">Break</SelectItem>
                          <SelectItem value="sensory">Sensory</SelectItem>
                          <SelectItem value="social">Social</SelectItem>
                          <SelectItem value="transition">Transition</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input
                        value={newActivity.location}
                        onChange={(e) => {
                          setNewActivity(prev => ({ ...prev, location: e.target.value }))
                          trackFieldInteraction('location')
                        }}
                        placeholder="Classroom, therapy room, cafeteria, etc."
                      />
                    </div>
                  </div>

                  <div className="space-y-2 mt-4">
                    <Label>Activity Details *</Label>
                    <Textarea
                      value={newActivity.details}
                      onChange={(e) => {
                        setNewActivity(prev => ({ ...prev, details: e.target.value }))
                        trackFieldInteraction('details')
                      }}
                      placeholder="Describe what the student did during this activity"
                      required
                    />
                  </div>
                </div>

                {/* Performance Metrics */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Performance & Response</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Student Response</Label>
                      <Select 
                        onValueChange={(value: any) => {
                          setNewActivity(prev => ({ ...prev, studentResponse: value }))
                          trackFieldInteraction('student-response')
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select response" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="positive">Positive</SelectItem>
                          <SelectItem value="neutral">Neutral</SelectItem>
                          <SelectItem value="negative">Negative</SelectItem>
                          <SelectItem value="mixed">Mixed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Engagement Level (1-5)</Label>
                      <Select 
                        onValueChange={(value) => {
                          setNewActivity(prev => ({ ...prev, engagementLevel: parseInt(value) as any }))
                          trackFieldInteraction('engagement-level')
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Rate engagement" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 - Very Low</SelectItem>
                          <SelectItem value="2">2 - Low</SelectItem>
                          <SelectItem value="3">3 - Moderate</SelectItem>
                          <SelectItem value="4">4 - High</SelectItem>
                          <SelectItem value="5">5 - Very High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Support Level</Label>
                      <Select 
                        onValueChange={(value: any) => {
                          setNewActivity(prev => ({ ...prev, supportLevel: value }))
                          trackFieldInteraction('support-level')
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select support level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="independent">Independent</SelectItem>
                          <SelectItem value="minimal">Minimal Support</SelectItem>
                          <SelectItem value="moderate">Moderate Support</SelectItem>
                          <SelectItem value="maximum">Maximum Support</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Objectives and Adaptations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-base font-medium">Activity Objectives</Label>
                    <div className="grid grid-cols-1 gap-2 mt-2 max-h-40 overflow-y-auto">
                      {activityObjectives.map((objective) => (
                        <div key={objective} className="flex items-center space-x-2">
                          <Checkbox
                            id={objective}
                            checked={newActivity.objectives.includes(objective)}
                            onCheckedChange={(checked) => {
                              setNewActivity(prev => ({
                                ...prev,
                                objectives: checked
                                  ? [...prev.objectives, objective]
                                  : prev.objectives.filter(o => o !== objective)
                              }))
                              trackFieldInteraction('objectives')
                            }}
                          />
                          <Label htmlFor={objective} className="text-sm">
                            {objective.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-base font-medium">Adaptations Used</Label>
                    <div className="grid grid-cols-1 gap-2 mt-2 max-h-40 overflow-y-auto">
                      {adaptationOptions.map((adaptation) => (
                        <div key={adaptation} className="flex items-center space-x-2">
                          <Checkbox
                            id={adaptation}
                            checked={newActivity.adaptationsUsed.includes(adaptation)}
                            onCheckedChange={(checked) => {
                              setNewActivity(prev => ({
                                ...prev,
                                adaptationsUsed: checked
                                  ? [...prev.adaptationsUsed, adaptation]
                                  : prev.adaptationsUsed.filter(a => a !== adaptation)
                              }))
                              trackFieldInteraction('adaptations')
                            }}
                          />
                          <Label htmlFor={adaptation} className="text-sm">
                            {adaptation.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Equipment and Follow-up */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-base font-medium">Equipment Used</Label>
                    <div className="grid grid-cols-1 gap-2 mt-2 max-h-32 overflow-y-auto">
                      {equipmentOptions.map((equipment) => (
                        <div key={equipment} className="flex items-center space-x-2">
                          <Checkbox
                            id={equipment}
                            checked={newActivity.equipmentUsed.includes(equipment)}
                            onCheckedChange={(checked) => {
                              setNewActivity(prev => ({
                                ...prev,
                                equipmentUsed: checked
                                  ? [...prev.equipmentUsed, equipment]
                                  : prev.equipmentUsed.filter(e => e !== equipment)
                              }))
                              trackFieldInteraction('equipment')
                            }}
                          />
                          <Label htmlFor={equipment} className="text-sm">
                            {equipment.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-base font-medium">Follow-up Actions</Label>
                    <div className="grid grid-cols-1 gap-2 mt-2 max-h-32 overflow-y-auto">
                      {followUpOptions.map((followUp) => (
                        <div key={followUp} className="flex items-center space-x-2">
                          <Checkbox
                            id={followUp}
                            checked={newActivity.followUpActions.includes(followUp)}
                            onCheckedChange={(checked) => {
                              setNewActivity(prev => ({
                                ...prev,
                                followUpActions: checked
                                  ? [...prev.followUpActions, followUp]
                                  : prev.followUpActions.filter(f => f !== followUp)
                              }))
                              trackFieldInteraction('follow-up')
                            }}
                          />
                          <Label htmlFor={followUp} className="text-sm">
                            {followUp.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <Label>Additional Notes</Label>
                  <Textarea
                    value={newActivity.notes}
                    onChange={(e) => {
                      setNewActivity(prev => ({ ...prev, notes: e.target.value }))
                      trackFieldInteraction('notes')
                    }}
                    placeholder="Any additional observations, challenges, or successes"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setShowAddLog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleLogCompletedActivity}>
                    Log Activity
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Active Activities */}
      {activeStudentActivities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-green-600" />
              Active Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeStudentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div>
                    <span className="font-medium">{activity.type.replace('-', ' ')}</span>
                    <p className="text-sm text-muted-foreground">{activity.details}</p>
                    <p className="text-xs text-muted-foreground">
                      Started: {new Date(activity.startTime).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleEndActivity(activity.id, true)}
                      className="flex items-center gap-1"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Complete
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEndActivity(activity.id, false)}
                      className="flex items-center gap-1"
                    >
                      <XCircle className="h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Activities</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayStats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Successful</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{todayStats.successful}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Positive Response</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{todayStats.positive}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Engagement</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayStats.averageEngagement.toFixed(1)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activities</CardTitle>
          <CardDescription>Latest activity logs and progress tracking</CardDescription>
        </CardHeader>
        <CardContent>
          {studentLogs.length > 0 ? (
            <div className="space-y-4">
              {studentLogs
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, 10)
                .map((log) => (
                  <div key={log.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{log.type.replace('-', ' ')}</Badge>
                        <Badge className={getResponseColor(log.studentResponse)}>
                          {log.studentResponse}
                        </Badge>
                        <Badge className={getSupportLevelColor(log.supportLevel)}>
                          {log.supportLevel} support
                        </Badge>
                        <Badge variant="secondary">
                          Engagement: {log.engagementLevel}/5
                        </Badge>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <div>{new Date(log.timestamp).toLocaleString()}</div>
                        {log.duration && (
                          <div>{log.duration} minutes</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-sm">
                      <p className="font-medium mb-1">Details:</p>
                      <p className="text-muted-foreground">{log.details}</p>
                    </div>

                    {(log.objectives?.length > 0 || log.adaptationsUsed?.length > 0) && (
                      <div className="pt-2 border-t">
                        {log.objectives?.length > 0 && (
                          <div className="mb-2">
                            <span className="font-medium text-sm">Objectives:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {log.objectives.map((objective, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {objective.replace('-', ' ')}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {log.adaptationsUsed?.length > 0 && (
                          <div>
                            <span className="font-medium text-sm">Adaptations:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {log.adaptationsUsed.map((adaptation, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {adaptation.replace('-', ' ')}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {log.notes && (
                      <div className="pt-2 border-t">
                        <span className="font-medium text-sm">Notes:</span>
                        <p className="text-sm text-muted-foreground mt-1">{log.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No activities logged yet</p>
              <p className="text-sm text-muted-foreground">Click "Log Activity" to add your first entry</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}