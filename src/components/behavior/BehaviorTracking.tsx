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
import { Plus, TrendingUp, AlertTriangle, CheckCircle, Clock } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface BehaviorTrackingProps {
  students: Student[]
  selectedStudentId: string
  onSelectStudent: (id: string) => void
}

export function BehaviorTracking({ students, selectedStudentId, onSelectStudent }: BehaviorTrackingProps) {
  const [behaviorLogs, setBehaviorLogs] = useKV<BehaviorLog[]>('behavior-logs', [])
  const [showAddLog, setShowAddLog] = useState(false)
  const [newLog, setNewLog] = useState({
    studentId: '',
    type: 'neutral' as 'positive' | 'challenging' | 'neutral',
    severity: 3 as 1 | 2 | 3 | 4 | 5,
    trigger: '',
    behavior: '',
    intervention: '',
    outcome: '',
    notes: ''
  })

  const selectedStudent = students.find(s => s.id === selectedStudentId)
  const studentLogs = behaviorLogs.filter(log => log.studentId === selectedStudentId)

  // Update form when student changes
  useEffect(() => {
    setNewLog(prev => ({
      ...prev,
      studentId: selectedStudentId || ''
    }))
  }, [selectedStudentId])

  const handleAddLog = () => {
    if (!newLog.studentId || !newLog.behavior || !newLog.intervention) {
      toast.error('Please fill in required fields')
      return
    }

    const log: BehaviorLog = {
      id: Date.now().toString(),
      ...newLog,
      timestamp: new Date().toISOString()
    }

    setBehaviorLogs(current => [...current, log])
    toast.success('Behavior log added successfully')
    
    setNewLog({
      studentId: selectedStudentId || '',
      type: 'neutral',
      severity: 3,
      trigger: '',
      behavior: '',
      intervention: '',
      outcome: '',
      notes: ''
    })
    setShowAddLog(false)
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
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Behavior Log</DialogTitle>
                <DialogDescription>
                  Record behavioral observation for {selectedStudent.name}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Behavior Type</Label>
                    <Select onValueChange={(value: any) => setNewLog(prev => ({ ...prev, type: value }))}>
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
                    <Label>Severity (1-5)</Label>
                    <Select onValueChange={(value) => setNewLog(prev => ({ ...prev, severity: parseInt(value) as any }))}>
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
                </div>

                <div className="space-y-2">
                  <Label>Trigger/Antecedent</Label>
                  <Input
                    value={newLog.trigger}
                    onChange={(e) => setNewLog(prev => ({ ...prev, trigger: e.target.value }))}
                    placeholder="What happened before the behavior?"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Behavior Description *</Label>
                  <Textarea
                    value={newLog.behavior}
                    onChange={(e) => setNewLog(prev => ({ ...prev, behavior: e.target.value }))}
                    placeholder="Describe the observed behavior"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Intervention Used *</Label>
                  <Textarea
                    value={newLog.intervention}
                    onChange={(e) => setNewLog(prev => ({ ...prev, intervention: e.target.value }))}
                    placeholder="What intervention or response was used?"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Outcome</Label>
                  <Textarea
                    value={newLog.outcome}
                    onChange={(e) => setNewLog(prev => ({ ...prev, outcome: e.target.value }))}
                    placeholder="What was the result of the intervention?"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Additional Notes</Label>
                  <Textarea
                    value={newLog.notes}
                    onChange={(e) => setNewLog(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Any additional observations or context"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAddLog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddLog}>Add Log</Button>
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
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Behavior:</span>
                        <p className="text-muted-foreground mt-1">{log.behavior}</p>
                      </div>
                      <div>
                        <span className="font-medium">Intervention:</span>
                        <p className="text-muted-foreground mt-1">{log.intervention}</p>
                      </div>
                    </div>

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