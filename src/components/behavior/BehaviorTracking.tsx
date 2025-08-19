import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Student, BehaviorLog } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, TrendingUp, AlertTriangle, CheckCircle, Clock, MapPin, User, Tag } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useLogging, useFormTracking } from '@/hooks/useLogging'
import { getCurrentSessionId } from '@/lib/logging'

interface BehaviorTrackingProps {
  students: Student[]
  selectedStudentId: string
  onSelectStudent: (id: string) => void
}

export function BehaviorTracking({ students, selectedStudentId, onSelectStudent }: BehaviorTrackingProps) {
  const [behaviorLogs, setBehaviorLogs] = useKV<BehaviorLog[]>('behavior-logs', [])
  const [showAddLog, setShowAddLog] = useState(false)
  const { logAction, logError } = useLogging()
  const { trackFormStart, trackFieldInteraction, trackFormSubmit, trackValidationError } = useFormTracking('behavior-log-form')
  
  const [newLog, setNewLog] = useState({
    studentId: '',
    type: 'neutral' as 'positive' | 'challenging' | 'neutral',
    severity: 3 as 1 | 2 | 3 | 4 | 5,
    trigger: '',
    behavior: '',
    intervention: '',
    outcome: '',
    notes: '',
    // Enhanced fields
    location: '',
    antecedent: '',
    consequence: '',
    interventionEffectiveness: 3 as 1 | 2 | 3 | 4 | 5,
    followUpRequired: false,
    environmentalFactors: [] as string[],
    tags: [] as string[],
    duration: ''
  })

  const selectedStudent = students.find(s => s.id === selectedStudentId)
  const studentLogs = behaviorLogs.filter(log => log.studentId === selectedStudentId)

  // Common tags for quick selection
  const commonTags = [
    'transition', 'academic', 'social', 'sensory', 'communication', 
    'peer-interaction', 'adult-interaction', 'self-regulation', 'attention'
  ]

  const environmentalOptions = [
    'loud-noise', 'crowded-space', 'new-environment', 'disrupted-routine',
    'peer-conflict', 'academic-demand', 'sensory-overload', 'fatigue'
  ]

  // Update form when student changes
  useEffect(() => {
    setNewLog(prev => ({
      ...prev,
      studentId: selectedStudentId || ''
    }))
  }, [selectedStudentId])

  // Log component usage
  useEffect(() => {
    logAction('view_behavior_tracking', selectedStudentId || 'no_student_selected')
  }, [selectedStudentId, logAction])

  const handleAddLog = async () => {
    trackFormStart()
    
    // Validation
    if (!newLog.studentId || !newLog.behavior || !newLog.intervention) {
      const missingFields = []
      if (!newLog.studentId) missingFields.push('student')
      if (!newLog.behavior) missingFields.push('behavior')
      if (!newLog.intervention) missingFields.push('intervention')
      
      trackValidationError('required-fields', `Missing: ${missingFields.join(', ')}`)
      toast.error('Please fill in required fields')
      return
    }

    try {
      const sessionId = getCurrentSessionId() || 'no-session'
      const currentUser = await spark.user()
      
      const log: BehaviorLog = {
        id: `behavior_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        ...newLog,
        timestamp: new Date().toISOString(),
        // Enhanced tracking fields
        sessionId,
        recordedBy: currentUser?.login || 'unknown-user',
        duration: newLog.duration ? parseInt(newLog.duration) : undefined,
        followUpCompleted: false,
        attachments: [],
        status: 'submitted'
      }

      setBehaviorLogs(current => [...current, log])
      
      logAction('behavior_log_created', selectedStudentId, {
        behaviorType: log.type,
        severity: log.severity,
        location: log.location,
        hasFollowUp: log.followUpRequired,
        tagsCount: log.tags.length,
        environmentalFactorsCount: log.environmentalFactors?.length || 0
      })
      
      trackFormSubmit({
        studentId: log.studentId,
        type: log.type,
        severity: log.severity,
        hasLocation: !!log.location,
        hasTags: log.tags.length > 0
      }, true)
      
      toast.success('Behavior log added successfully')
      
      // Reset form
      setNewLog({
        studentId: selectedStudentId || '',
        type: 'neutral',
        severity: 3,
        trigger: '',
        behavior: '',
        intervention: '',
        outcome: '',
        notes: '',
        location: '',
        antecedent: '',
        consequence: '',
        interventionEffectiveness: 3,
        followUpRequired: false,
        environmentalFactors: [],
        tags: [],
        duration: ''
      })
      setShowAddLog(false)
    } catch (error) {
      logError('behavior_log_creation', error?.toString() || 'Unknown error', selectedStudentId)
      trackFormSubmit({}, false)
      toast.error('Failed to add behavior log')
    }
  }

  const getBehaviorTypeColor = (type: string) => {
    switch (type) {
      case 'positive': return 'bg-secondary text-secondary-foreground'
      case 'challenging': return 'bg-destructive text-destructive-foreground'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const getSeverityColor = (severity: number) => {
    if (severity <= 2) return 'bg-secondary text-secondary-foreground'
    if (severity <= 3) return 'bg-muted text-muted-foreground'
    return 'bg-destructive text-destructive-foreground'
  }

  const getWeeklyStats = () => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const weeklyLogs = studentLogs.filter(log => new Date(log.timestamp) >= weekAgo)
    
    return {
      total: weeklyLogs.length,
      positive: weeklyLogs.filter(log => log.type === 'positive').length,
      challenging: weeklyLogs.filter(log => log.type === 'challenging').length,
      averageSeverity: weeklyLogs.length > 0 ? 
        weeklyLogs.reduce((sum, log) => sum + log.severity, 0) / weeklyLogs.length : 0
    }
  }

  if (!selectedStudent) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold mb-2">Behavior Tracking</h2>
          <p className="text-muted-foreground">Select a student to track their behavioral patterns</p>
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
                  {behaviorLogs.filter(log => log.studentId === student.id).length} total logs
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const weeklyStats = getWeeklyStats()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">{selectedStudent.name} - Behavior Tracking</h2>
          <p className="text-muted-foreground">Monitor behavioral patterns and interventions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onSelectStudent('')}>
            Back to Students
          </Button>
          <Dialog open={showAddLog} onOpenChange={setShowAddLog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Log Behavior
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Behavior Log</DialogTitle>
                <DialogDescription>
                  Record comprehensive behavioral observation for {selectedStudent.name}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Behavior Type *</Label>
                      <Select 
                        onValueChange={(value: any) => {
                          setNewLog(prev => ({ ...prev, type: value }))
                          trackFieldInteraction('type')
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="positive">Positive</SelectItem>
                          <SelectItem value="neutral">Neutral</SelectItem>
                          <SelectItem value="challenging">Challenging</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Severity (1-5) *</Label>
                      <Select 
                        onValueChange={(value) => {
                          setNewLog(prev => ({ ...prev, severity: parseInt(value) as any }))
                          trackFieldInteraction('severity')
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select severity" />
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
                      <Label>Duration (minutes)</Label>
                      <Input
                        type="number"
                        value={newLog.duration}
                        onChange={(e) => {
                          setNewLog(prev => ({ ...prev, duration: e.target.value }))
                          trackFieldInteraction('duration')
                        }}
                        placeholder="0"
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Context Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Context Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input
                        value={newLog.location}
                        onChange={(e) => {
                          setNewLog(prev => ({ ...prev, location: e.target.value }))
                          trackFieldInteraction('location')
                        }}
                        placeholder="Classroom, hallway, cafeteria, etc."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Environmental Factors</Label>
                      <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                        {environmentalOptions.map((factor) => (
                          <div key={factor} className="flex items-center space-x-2">
                            <Checkbox
                              id={factor}
                              checked={newLog.environmentalFactors.includes(factor)}
                              onCheckedChange={(checked) => {
                                setNewLog(prev => ({
                                  ...prev,
                                  environmentalFactors: checked
                                    ? [...prev.environmentalFactors, factor]
                                    : prev.environmentalFactors.filter(f => f !== factor)
                                }))
                                trackFieldInteraction('environmental-factors')
                              }}
                            />
                            <Label htmlFor={factor} className="text-sm">
                              {factor.replace('-', ' ')}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ABC Analysis */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">ABC Analysis</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Antecedent (What happened before?)</Label>
                      <Textarea
                        value={newLog.antecedent}
                        onChange={(e) => {
                          setNewLog(prev => ({ ...prev, antecedent: e.target.value }))
                          trackFieldInteraction('antecedent')
                        }}
                        placeholder="Describe what happened immediately before the behavior"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Behavior Description *</Label>
                      <Textarea
                        value={newLog.behavior}
                        onChange={(e) => {
                          setNewLog(prev => ({ ...prev, behavior: e.target.value }))
                          trackFieldInteraction('behavior')
                        }}
                        placeholder="Describe the observed behavior objectively"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Consequence (What happened after?)</Label>
                      <Textarea
                        value={newLog.consequence}
                        onChange={(e) => {
                          setNewLog(prev => ({ ...prev, consequence: e.target.value }))
                          trackFieldInteraction('consequence')
                        }}
                        placeholder="Describe what happened immediately after the behavior"
                      />
                    </div>
                  </div>
                </div>

                {/* Intervention and Outcome */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Intervention & Outcome</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Intervention Used *</Label>
                      <Textarea
                        value={newLog.intervention}
                        onChange={(e) => {
                          setNewLog(prev => ({ ...prev, intervention: e.target.value }))
                          trackFieldInteraction('intervention')
                        }}
                        placeholder="What intervention or response was used?"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Intervention Effectiveness (1-5)</Label>
                        <Select 
                          onValueChange={(value) => {
                            setNewLog(prev => ({ ...prev, interventionEffectiveness: parseInt(value) as any }))
                            trackFieldInteraction('intervention-effectiveness')
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Rate effectiveness" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 - Not Effective</SelectItem>
                            <SelectItem value="2">2 - Slightly Effective</SelectItem>
                            <SelectItem value="3">3 - Moderately Effective</SelectItem>
                            <SelectItem value="4">4 - Very Effective</SelectItem>
                            <SelectItem value="5">5 - Extremely Effective</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Follow-up Required</Label>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="followUp"
                            checked={newLog.followUpRequired}
                            onCheckedChange={(checked) => {
                              setNewLog(prev => ({ ...prev, followUpRequired: !!checked }))
                              trackFieldInteraction('follow-up-required')
                            }}
                          />
                          <Label htmlFor="followUp">This incident requires follow-up action</Label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Outcome</Label>
                      <Textarea
                        value={newLog.outcome}
                        onChange={(e) => {
                          setNewLog(prev => ({ ...prev, outcome: e.target.value }))
                          trackFieldInteraction('outcome')
                        }}
                        placeholder="What was the result of the intervention?"
                      />
                    </div>
                  </div>
                </div>

                {/* Tags and Notes */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    Additional Information
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Tags</Label>
                      <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                        {commonTags.map((tag) => (
                          <div key={tag} className="flex items-center space-x-2">
                            <Checkbox
                              id={tag}
                              checked={newLog.tags.includes(tag)}
                              onCheckedChange={(checked) => {
                                setNewLog(prev => ({
                                  ...prev,
                                  tags: checked
                                    ? [...prev.tags, tag]
                                    : prev.tags.filter(t => t !== tag)
                                }))
                                trackFieldInteraction('tags')
                              }}
                            />
                            <Label htmlFor={tag} className="text-sm">
                              {tag.replace('-', ' ')}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Additional Notes</Label>
                      <Textarea
                        value={newLog.notes}
                        onChange={(e) => {
                          setNewLog(prev => ({ ...prev, notes: e.target.value }))
                          trackFieldInteraction('notes')
                        }}
                        placeholder="Any additional observations, context, or relevant information"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setShowAddLog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddLog}>Add Behavior Log</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{weeklyStats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Positive Behaviors</CardTitle>
            <CheckCircle className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">{weeklyStats.positive}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Challenging Behaviors</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{weeklyStats.challenging}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Severity</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{weeklyStats.averageSeverity.toFixed(1)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Behavior Logs</CardTitle>
          <CardDescription>Latest behavioral observations and interventions</CardDescription>
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
                        <Badge className={getBehaviorTypeColor(log.type)}>
                          {log.type}
                        </Badge>
                        <Badge className={getSeverityColor(log.severity)}>
                          Severity {log.severity}
                        </Badge>
                        {log.followUpRequired && (
                          <Badge variant="outline" className="text-orange-600 border-orange-600">
                            Follow-up Required
                          </Badge>
                        )}
                        {log.location && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {log.location}
                          </Badge>
                        )}
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <div>{new Date(log.timestamp).toLocaleString()}</div>
                        {log.recordedBy && (
                          <div className="flex items-center gap-1 mt-1">
                            <User className="h-3 w-3" />
                            {log.recordedBy}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Behavior:</span>
                        <p className="text-muted-foreground mt-1">{log.behavior}</p>
                      </div>
                      <div>
                        <span className="font-medium">Intervention:</span>
                        <p className="text-muted-foreground mt-1">{log.intervention}</p>
                        {log.interventionEffectiveness && (
                          <div className="mt-1">
                            <Badge variant="outline" className="text-xs">
                              Effectiveness: {log.interventionEffectiveness}/5
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Enhanced information sections */}
                    {(log.antecedent || log.consequence || log.duration) && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm pt-2 border-t">
                        {log.antecedent && (
                          <div>
                            <span className="font-medium">Antecedent:</span>
                            <p className="text-muted-foreground mt-1">{log.antecedent}</p>
                          </div>
                        )}
                        {log.consequence && (
                          <div>
                            <span className="font-medium">Consequence:</span>
                            <p className="text-muted-foreground mt-1">{log.consequence}</p>
                          </div>
                        )}
                        {log.duration && (
                          <div>
                            <span className="font-medium">Duration:</span>
                            <p className="text-muted-foreground mt-1">{log.duration} minutes</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tags and Environmental Factors */}
                    {(log.tags?.length > 0 || log.environmentalFactors?.length > 0) && (
                      <div className="pt-2 border-t">
                        {log.tags?.length > 0 && (
                          <div className="mb-2">
                            <span className="font-medium text-sm">Tags:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {log.tags.map((tag, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {tag.replace('-', ' ')}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {log.environmentalFactors?.length > 0 && (
                          <div className="mb-2">
                            <span className="font-medium text-sm">Environmental Factors:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {log.environmentalFactors.map((factor, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {factor.replace('-', ' ')}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {(log.trigger || log.outcome || log.notes) && (
                      <div className="pt-2 border-t">
                        {log.trigger && (
                          <div className="mb-2">
                            <span className="font-medium text-sm">Trigger:</span>
                            <p className="text-sm text-muted-foreground">{log.trigger}</p>
                          </div>
                        )}
                        {log.outcome && (
                          <div className="mb-2">
                            <span className="font-medium text-sm">Outcome:</span>
                            <p className="text-sm text-muted-foreground">{log.outcome}</p>
                          </div>
                        )}
                        {log.notes && (
                          <div>
                            <span className="font-medium text-sm">Notes:</span>
                            <p className="text-sm text-muted-foreground">{log.notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No behavior logs recorded yet</p>
              <p className="text-sm text-muted-foreground">Click "Log Behavior" to add your first entry</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}