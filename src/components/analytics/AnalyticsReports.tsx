import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Student, BehaviorLog, ActivityLog, Message, SystemLog } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart, TrendingUp, Users, Activity, MessageCircle, AlertTriangle, Download, Calendar } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { loggingService } from '@/lib/logging'
import { useLogging } from '@/hooks/useLogging'

interface AnalyticsReportsProps {
  students: Student[]
  selectedStudentId: string
  onSelectStudent: (id: string) => void
}

export function AnalyticsReports({ students, selectedStudentId, onSelectStudent }: AnalyticsReportsProps) {
  const [behaviorLogs] = useKV<BehaviorLog[]>('behavior-logs', [])
  const [activityLogs] = useKV<ActivityLog[]>('activity-logs', [])
  const [messages] = useKV<Message[]>('messages', [])
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([])
  const [dateRange, setDateRange] = useState('7days')
  const [reportType, setReportType] = useState('overview')
  const { logAction } = useLogging()

  const selectedStudent = students.find(s => s.id === selectedStudentId)

  // Load system logs
  useEffect(() => {
    const loadSystemLogs = async () => {
      try {
        const logs = await loggingService.getLogs()
        setSystemLogs(logs)
      } catch (error) {
        console.error('Failed to load system logs:', error)
      }
    }
    loadSystemLogs()
  }, [])

  // Log component usage
  useEffect(() => {
    logAction('view_analytics_reports', selectedStudentId || 'all_students')
  }, [selectedStudentId, logAction])

  const getDateRangeFilter = () => {
    const now = new Date()
    const days = parseInt(dateRange.replace('days', ''))
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    return startDate
  }

  const filterByDateRange = <T extends { timestamp: string }>(items: T[]): T[] => {
    const startDate = getDateRangeFilter()
    return items.filter(item => new Date(item.timestamp) >= startDate)
  }

  const getOverviewStats = () => {
    const filteredBehaviorLogs = filterByDateRange(behaviorLogs)
    const filteredActivityLogs = filterByDateRange(activityLogs)
    const filteredMessages = filterByDateRange(messages)
    const filteredSystemLogs = filterByDateRange(systemLogs)

    const studentData = selectedStudentId 
      ? {
          behaviorLogs: filteredBehaviorLogs.filter(log => log.studentId === selectedStudentId),
          activityLogs: filteredActivityLogs.filter(log => log.studentId === selectedStudentId),
          messages: filteredMessages.filter(msg => msg.studentId === selectedStudentId)
        }
      : {
          behaviorLogs: filteredBehaviorLogs,
          activityLogs: filteredActivityLogs,
          messages: filteredMessages
        }

    return {
      totalBehaviorLogs: studentData.behaviorLogs.length,
      positiveBehaviors: studentData.behaviorLogs.filter(log => log.type === 'positive').length,
      challengingBehaviors: studentData.behaviorLogs.filter(log => log.type === 'challenging').length,
      averageSeverity: studentData.behaviorLogs.length > 0 
        ? studentData.behaviorLogs.reduce((sum, log) => sum + log.severity, 0) / studentData.behaviorLogs.length 
        : 0,
      
      totalActivities: studentData.activityLogs.length,
      successfulActivities: studentData.activityLogs.filter(log => log.success).length,
      averageEngagement: studentData.activityLogs.length > 0
        ? studentData.activityLogs.reduce((sum, log) => sum + log.engagementLevel, 0) / studentData.activityLogs.length
        : 0,
      
      totalMessages: studentData.messages.length,
      unreadMessages: studentData.messages.filter(msg => !msg.read).length,
      urgentMessages: studentData.messages.filter(msg => msg.priority === 'urgent').length,
      
      systemEvents: filteredSystemLogs.length,
      errorEvents: filteredSystemLogs.filter(log => log.level === 'error').length,
      userActions: filteredSystemLogs.filter(log => log.category === 'user-action').length
    }
  }

  const getBehaviorTrends = () => {
    const filteredLogs = selectedStudentId 
      ? behaviorLogs.filter(log => log.studentId === selectedStudentId)
      : behaviorLogs
    
    const weeklyData = []
    const now = new Date()
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dayStart = new Date(date.setHours(0, 0, 0, 0))
      const dayEnd = new Date(date.setHours(23, 59, 59, 999))
      
      const dayLogs = filteredLogs.filter(log => {
        const logDate = new Date(log.timestamp)
        return logDate >= dayStart && logDate <= dayEnd
      })
      
      weeklyData.push({
        date: dayStart.toLocaleDateString('en-US', { weekday: 'short' }),
        positive: dayLogs.filter(log => log.type === 'positive').length,
        challenging: dayLogs.filter(log => log.type === 'challenging').length,
        neutral: dayLogs.filter(log => log.type === 'neutral').length,
        total: dayLogs.length
      })
    }
    
    return weeklyData
  }

  const getActivityBreakdown = () => {
    const filteredLogs = selectedStudentId 
      ? activityLogs.filter(log => log.studentId === selectedStudentId)
      : activityLogs
    
    const breakdown = filteredLogs.reduce((acc, log) => {
      acc[log.type] = (acc[log.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return Object.entries(breakdown).map(([type, count]) => ({
      type: type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      count
    }))
  }

  const getInterventionEffectiveness = () => {
    const filteredLogs = selectedStudentId 
      ? behaviorLogs.filter(log => log.studentId === selectedStudentId)
      : behaviorLogs
    
    const interventions = filteredLogs.reduce((acc, log) => {
      if (log.interventionEffectiveness) {
        if (!acc[log.intervention]) {
          acc[log.intervention] = {
            count: 0,
            totalEffectiveness: 0,
            averageEffectiveness: 0
          }
        }
        acc[log.intervention].count++
        acc[log.intervention].totalEffectiveness += log.interventionEffectiveness
        acc[log.intervention].averageEffectiveness = 
          acc[log.intervention].totalEffectiveness / acc[log.intervention].count
      }
      return acc
    }, {} as Record<string, { count: number; totalEffectiveness: number; averageEffectiveness: number }>)
    
    return Object.entries(interventions)
      .map(([intervention, data]) => ({
        intervention,
        ...data
      }))
      .sort((a, b) => b.averageEffectiveness - a.averageEffectiveness)
  }

  const exportData = async () => {
    try {
      const stats = getOverviewStats()
      const trends = getBehaviorTrends()
      const activities = getActivityBreakdown()
      const interventions = getInterventionEffectiveness()
      
      const reportData = {
        generatedAt: new Date().toISOString(),
        studentName: selectedStudent?.name || 'All Students',
        dateRange,
        overview: stats,
        behaviorTrends: trends,
        activityBreakdown: activities,
        interventionEffectiveness: interventions
      }
      
      const dataStr = JSON.stringify(reportData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `neurosupport-report-${selectedStudent?.name || 'all-students'}-${new Date().toISOString().split('T')[0]}.json`
      link.click()
      
      URL.revokeObjectURL(url)
      
      logAction('report_exported', selectedStudentId || 'all_students', {
        reportType,
        dateRange,
        dataSize: dataStr.length
      })
      
      toast.success('Report exported successfully')
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Failed to export report')
    }
  }

  const stats = getOverviewStats()
  const behaviorTrends = getBehaviorTrends()
  const activityBreakdown = getActivityBreakdown()
  const interventionEffectiveness = getInterventionEffectiveness()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">
            {selectedStudent ? `${selectedStudent.name} - Analytics` : 'Analytics & Reports'}
          </h2>
          <p className="text-muted-foreground">
            Comprehensive insights and data analysis
          </p>
        </div>
        <div className="flex gap-2">
          {selectedStudent && (
            <Button variant="outline" onClick={() => onSelectStudent('')}>
              View All Students
            </Button>
          )}
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">7 Days</SelectItem>
              <SelectItem value="30days">30 Days</SelectItem>
              <SelectItem value="90days">90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportData} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {!selectedStudent && students.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {students.map((student) => {
            const studentBehaviorLogs = behaviorLogs.filter(log => log.studentId === student.id)
            const studentActivityLogs = activityLogs.filter(log => log.studentId === student.id)
            
            return (
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
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Behavior Logs:</span>
                      <span>{studentBehaviorLogs.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Activities:</span>
                      <span>{studentActivityLogs.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Positive Behaviors:</span>
                      <span className="text-green-600">
                        {studentBehaviorLogs.filter(log => log.type === 'positive').length}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Tabs value={reportType} onValueChange={setReportType} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="behavior" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Behavior Trends
          </TabsTrigger>
          <TabsTrigger value="activities" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Activities
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            System Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Behavior Logs</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalBehaviorLogs}</div>
                <div className="text-xs text-muted-foreground">
                  {stats.positiveBehaviors} positive, {stats.challengingBehaviors} challenging
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Activities</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalActivities}</div>
                <div className="text-xs text-muted-foreground">
                  {stats.successfulActivities} successful ({((stats.successfulActivities / stats.totalActivities) * 100 || 0).toFixed(1)}%)
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Messages</CardTitle>
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalMessages}</div>
                <div className="text-xs text-muted-foreground">
                  {stats.unreadMessages} unread, {stats.urgentMessages} urgent
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Engagement</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.averageEngagement.toFixed(1)}</div>
                <div className="text-xs text-muted-foreground">
                  Severity: {stats.averageSeverity.toFixed(1)}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Behavior Trends (Last 7 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {behaviorTrends.map((day, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm font-medium w-12">{day.date}</span>
                      <div className="flex items-center gap-2 flex-1 ml-4">
                        <div className="flex-1 bg-muted rounded-full h-6 relative overflow-hidden">
                          <div 
                            className="bg-green-500 h-full absolute left-0" 
                            style={{ width: `${(day.positive / Math.max(day.total, 1)) * 100}%` }}
                          />
                          <div 
                            className="bg-yellow-500 h-full absolute" 
                            style={{ 
                              left: `${(day.positive / Math.max(day.total, 1)) * 100}%`,
                              width: `${(day.neutral / Math.max(day.total, 1)) * 100}%` 
                            }}
                          />
                          <div 
                            className="bg-red-500 h-full absolute right-0" 
                            style={{ width: `${(day.challenging / Math.max(day.total, 1)) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-8">{day.total}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-4 mt-4 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                    Positive
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                    Neutral
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-red-500 rounded-full" />
                    Challenging
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Activity Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activityBreakdown.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{item.type}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-muted rounded-full h-4 relative overflow-hidden">
                          <div 
                            className="bg-primary h-full rounded-full" 
                            style={{ 
                              width: `${(item.count / Math.max(...activityBreakdown.map(a => a.count), 1)) * 100}%` 
                            }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-8">{item.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="behavior">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Intervention Effectiveness</CardTitle>
                <CardDescription>
                  Average effectiveness rating for different intervention strategies
                </CardDescription>
              </CardHeader>
              <CardContent>
                {interventionEffectiveness.length > 0 ? (
                  <div className="space-y-4">
                    {interventionEffectiveness.map((item, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{item.intervention}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{item.count} uses</Badge>
                            <Badge 
                              className={
                                item.averageEffectiveness >= 4 ? 'bg-green-100 text-green-800' :
                                item.averageEffectiveness >= 3 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }
                            >
                              {item.averageEffectiveness.toFixed(1)}/5
                            </Badge>
                          </div>
                        </div>
                        <div className="w-full bg-muted rounded-full h-3">
                          <div 
                            className={`h-3 rounded-full ${
                              item.averageEffectiveness >= 4 ? 'bg-green-500' :
                              item.averageEffectiveness >= 3 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${(item.averageEffectiveness / 5) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No intervention effectiveness data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activities">
          <Card>
            <CardHeader>
              <CardTitle>Activity Performance Analysis</CardTitle>
              <CardDescription>
                Detailed breakdown of activity engagement and success rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Detailed activity analysis coming soon
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle>System Activity Logs</CardTitle>
              <CardDescription>
                Technical logs and user activity tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{stats.systemEvents}</div>
                    <p className="text-sm text-muted-foreground">Total Events</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-red-600">{stats.errorEvents}</div>
                    <p className="text-sm text-muted-foreground">Error Events</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-blue-600">{stats.userActions}</div>
                    <p className="text-sm text-muted-foreground">User Actions</p>
                  </CardContent>
                </Card>
              </div>
              
              {systemLogs.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {systemLogs
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .slice(0, 50)
                    .map((log, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm p-2 border rounded">
                        <Badge 
                          variant={
                            log.level === 'error' ? 'destructive' : 
                            log.level === 'warn' ? 'secondary' : 'outline'
                          }
                          className="text-xs"
                        >
                          {log.level}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                        <span className="flex-1">{log.message}</span>
                        {log.userId && (
                          <Badge variant="outline" className="text-xs">
                            {log.userId}
                          </Badge>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No system logs available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}