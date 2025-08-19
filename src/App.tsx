import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Student, BehaviorLog, ActivityLog, Message, CrisisProtocol, DailySchedule } from '@/lib/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Users, MessageCircle, Activity, Shield, TrendingUp, BarChart, Calendar, SignOut, Settings } from '@phosphor-icons/react'
import { StudentDashboard } from '@/components/student/StudentDashboard'
import { BehaviorTracking } from '@/components/behavior/BehaviorTracking'
import { CommunicationHub } from '@/components/communication/CommunicationHub'
import { CrisisManagement } from '@/components/crisis/CrisisManagement'
import { ActivityLogging } from '@/components/activity/ActivityLogging'
import { AnalyticsReports } from '@/components/analytics/AnalyticsReports'
import { ScheduleView } from '@/components/schedule/ScheduleView'
import { AddStudentDialog } from '@/components/student/AddStudentDialog'
import { LoginForm } from '@/components/auth/LoginForm'
import { PrivacySettings } from '@/components/auth/PrivacySettings'
import { Toaster } from '@/components/ui/sonner'
import { loggingService } from '@/lib/logging'
import { usePageTracking } from '@/hooks/useLogging'
import { useAuth, usePermissions } from '@/hooks/useAuth'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

function App() {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth()
  const { canCreate, canRead } = usePermissions()
  const [students, setStudents] = useKV<Student[]>('students', [])
  const [behaviorLogs] = useKV<BehaviorLog[]>('behavior-logs', [])
  const [activityLogs] = useKV<ActivityLog[]>('activity-logs', [])
  const [messages] = useKV<Message[]>('messages', [])
  const [selectedStudentId, setSelectedStudentId] = useState<string>('')
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [showPrivacySettings, setShowPrivacySettings] = useState(false)
  const { trackNavigation } = usePageTracking('NeuroSupport-Dashboard')

  // Show login form if not authenticated
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginForm />
  }

  if (showPrivacySettings) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">NeuroSupport</h1>
                <p className="text-sm text-muted-foreground">Privacy & Data Protection</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => setShowPrivacySettings(false)}>
              Back to Dashboard
            </Button>
          </div>
        </header>
        <main className="p-6">
          <PrivacySettings />
        </main>
      </div>
    )
  }

  // Migrate existing students to include schedule if missing
  useEffect(() => {
    const migrateStudents = async () => {
      if (!canRead('students')) return
      
      const studentsNeedingMigration = students.filter(student => !student.schedule)
      
      if (studentsNeedingMigration.length > 0) {
        try {
          const migratedStudents = students.map(student => {
            if (!student.schedule) {
              const emptySchedule: DailySchedule = {
                id: crypto.randomUUID(),
                studentId: student.id,
                effectiveDate: new Date().toISOString(),
                blocks: [],
                breaks: [],
                lastUpdated: new Date().toISOString(),
                updatedBy: user?.id || 'system',
                isActive: true
              }
              return { ...student, schedule: emptySchedule }
            }
            return student
          })
          
          await setStudents(migratedStudents)
        } catch (error) {
          console.error('Failed to migrate student schedules:', error)
        }
      }
    }

    if (students.length > 0 && user) {
      migrateStudents()
    }
  }, [students, setStudents, user, canRead])

  // Initialize logging service - removed since it's now handled in auth service
  useEffect(() => {
    // Logging is now initialized in the auth service during login
    return () => {
      // Cleanup is handled by auth service logout
    }
  }, [])

  const selectedStudent = students.find(s => s.id === selectedStudentId)
  const unreadMessages = messages.filter(m => !m.read).length
  const todayLogs = behaviorLogs.filter(log => 
    new Date(log.timestamp).toDateString() === new Date().toDateString()
  ).length

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">NeuroSupport</h1>
              <p className="text-sm text-muted-foreground">Student Care Management</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {students.length} Students
            </Badge>
            {unreadMessages > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <MessageCircle className="h-4 w-4" />
                {unreadMessages} Unread
              </Badge>
            )}
            {canCreate('students') && (
              <Button onClick={() => setShowAddStudent(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Student
              </Button>
            )}
            
            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline">{user?.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="flex items-center gap-2">
                  <div className="text-sm">
                    <p className="font-medium">{user?.name}</p>
                    <p className="text-muted-foreground">{user?.email}</p>
                    <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowPrivacySettings(true)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Privacy Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <SignOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="p-6">
        {students.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
            <Users className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Welcome to NeuroSupport</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Start by adding your first student to begin tracking their care, progress, and daily activities.
            </p>
            {canCreate('students') && (
              <Button onClick={() => setShowAddStudent(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Your First Student
              </Button>
            )}
          </div>
        ) : (
          <Tabs defaultValue="dashboard" className="space-y-6">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="schedule" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Schedule
              </TabsTrigger>
              <TabsTrigger value="behavior" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Behavior
              </TabsTrigger>
              <TabsTrigger value="communication" className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Messages
                {unreadMessages > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 text-xs">
                    {unreadMessages}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="activities" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Activities
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <BarChart className="h-4 w-4" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="crisis" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Crisis
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard">
              <StudentDashboard 
                students={students}
                selectedStudentId={selectedStudentId}
                onSelectStudent={setSelectedStudentId}
                behaviorLogs={behaviorLogs}
                activityLogs={activityLogs}
              />
            </TabsContent>

            <TabsContent value="schedule">
              <ScheduleView 
                students={students}
                selectedStudentId={selectedStudentId}
                onSelectStudent={setSelectedStudentId}
              />
            </TabsContent>

            <TabsContent value="behavior">
              <BehaviorTracking 
                students={students}
                selectedStudentId={selectedStudentId}
                onSelectStudent={setSelectedStudentId}
              />
            </TabsContent>

            <TabsContent value="communication">
              <CommunicationHub 
                students={students}
                selectedStudentId={selectedStudentId}
                onSelectStudent={setSelectedStudentId}
              />
            </TabsContent>

            <TabsContent value="activities">
              <ActivityLogging 
                students={students}
                selectedStudentId={selectedStudentId}
                onSelectStudent={setSelectedStudentId}
              />
            </TabsContent>

            <TabsContent value="analytics">
              <AnalyticsReports 
                students={students}
                selectedStudentId={selectedStudentId}
                onSelectStudent={setSelectedStudentId}
              />
            </TabsContent>

            <TabsContent value="crisis">
              <CrisisManagement 
                students={students}
                selectedStudentId={selectedStudentId}
                onSelectStudent={setSelectedStudentId}
              />
            </TabsContent>
          </Tabs>
        )}
      </main>

      <AddStudentDialog 
        open={showAddStudent}
        onOpenChange={setShowAddStudent}
      />

      <Toaster />
    </div>
  )
}

export default App