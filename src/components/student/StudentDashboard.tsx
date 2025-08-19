import { Student, BehaviorLog, ActivityLog } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { User, Clock, TrendingUp, Activity, Phone } from '@phosphor-icons/react'

interface StudentDashboardProps {
  students: Student[]
  selectedStudentId: string
  onSelectStudent: (id: string) => void
  behaviorLogs: BehaviorLog[]
  activityLogs: ActivityLog[]
}

export function StudentDashboard({ 
  students, 
  selectedStudentId, 
  onSelectStudent,
  behaviorLogs,
  activityLogs 
}: StudentDashboardProps) {
  const selectedStudent = students.find(s => s.id === selectedStudentId)

  const getStudentBehaviorSummary = (studentId: string) => {
    const logs = behaviorLogs.filter(log => log.studentId === studentId)
    const today = new Date().toDateString()
    const thisWeek = logs.filter(log => {
      const logDate = new Date(log.timestamp)
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      return logDate >= weekAgo
    })
    
    return {
      todayCount: logs.filter(log => new Date(log.timestamp).toDateString() === today).length,
      weeklyCount: thisWeek.length,
      positiveRatio: thisWeek.length > 0 ? 
        (thisWeek.filter(log => log.type === 'positive').length / thisWeek.length) * 100 : 0
    }
  }

  const getStudentActivitySummary = (studentId: string) => {
    const logs = activityLogs.filter(log => log.studentId === studentId)
    const today = new Date().toDateString()
    const todayLogs = logs.filter(log => new Date(log.timestamp).toDateString() === today)
    
    return {
      todayActivities: todayLogs.length,
      lastActivity: logs.length > 0 ? logs[logs.length - 1] : null
    }
  }

  if (!selectedStudent) {
    return (
      <div className="grid gap-6">
        <div>
          <h2 className="text-3xl font-bold mb-2">Student Overview</h2>
          <p className="text-muted-foreground">Select a student to view their detailed information</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {students.map((student) => {
            const behaviorSummary = getStudentBehaviorSummary(student.id)
            const activitySummary = getStudentActivitySummary(student.id)
            
            return (
              <Card 
                key={student.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => onSelectStudent(student.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {student.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{student.name}</CardTitle>
                      <CardDescription>
                        Age {student.age} • {student.grade}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Today's Logs</span>
                    <Badge variant="secondary">{behaviorSummary.todayCount}</Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Weekly Positive</span>
                    <span className="text-sm font-medium">
                      {behaviorSummary.positiveRatio.toFixed(0)}%
                    </span>
                  </div>
                  
                  {student.supportNeeds.length > 0 && (
                    <div className="pt-2">
                      <div className="flex flex-wrap gap-1">
                        {student.supportNeeds.slice(0, 2).map((need) => (
                          <Badge key={need} variant="outline" className="text-xs">
                            {need}
                          </Badge>
                        ))}
                        {student.supportNeeds.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{student.supportNeeds.length - 2} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    )
  }

  const behaviorSummary = getStudentBehaviorSummary(selectedStudent.id)
  const activitySummary = getStudentActivitySummary(selectedStudent.id)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg">
              {selectedStudent.name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-3xl font-bold">{selectedStudent.name}</h2>
            <p className="text-muted-foreground">
              Age {selectedStudent.age} • {selectedStudent.grade}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => onSelectStudent('')}>
          Back to Overview
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Behavior Logs</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{behaviorSummary.todayCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Positive Ratio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{behaviorSummary.positiveRatio.toFixed(0)}%</div>
            <Progress value={behaviorSummary.positiveRatio} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Activities</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activitySummary.todayActivities}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emergency Contact</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {selectedStudent.emergencyContacts.length > 0 ? (
              <div>
                <div className="font-medium text-sm">
                  {selectedStudent.emergencyContacts[0].name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {selectedStudent.emergencyContacts[0].relationship}
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No contact added</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Support Needs</CardTitle>
            <CardDescription>Current accommodations and support requirements</CardDescription>
          </CardHeader>
          <CardContent>
            {selectedStudent.supportNeeds.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedStudent.supportNeeds.map((need) => (
                  <Badge key={need} variant="secondary">
                    {need}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No support needs specified</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>IEP Goals Progress</CardTitle>
            <CardDescription>Current educational and behavioral objectives</CardDescription>
          </CardHeader>
          <CardContent>
            {selectedStudent.iepGoals.length > 0 ? (
              <div className="space-y-4">
                {selectedStudent.iepGoals.map((goal) => (
                  <div key={goal.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-sm">{goal.title}</span>
                      <Badge variant="outline">{goal.category}</Badge>
                    </div>
                    <Progress value={goal.progress} />
                    <p className="text-xs text-muted-foreground">{goal.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No IEP goals added yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedStudent.careNotes && (
        <Card>
          <CardHeader>
            <CardTitle>Care Notes</CardTitle>
            <CardDescription>Important information and strategies</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{selectedStudent.careNotes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}