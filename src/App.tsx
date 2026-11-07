import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Student, BehaviorLog, ActivityLog, Message, DailySchedule } from '@/lib/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Users, ChatCircle, Activity, TrendUp, ChartBar, Calendar, SignOut, Gear, Lifebuoy } from '@phosphor-icons/react'
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
import { Logo } from '@/components/brand/Logo'
import { Toaster } from '@/components/ui/sonner'
import { usePageTracking } from '@/hooks/useLogging'
import { useAuth, usePermissions } from '@/hooks/useAuth'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

function App() {
  const { user, isAuthenticated, isInitializing, logout } = useAuth()
  const { canCreate, canRead } = usePermissions()
  const [students = [], setStudents] = useKV<Student[]>('students', [])
  const [behaviorLogs = []] = useKV<BehaviorLog[]>('behavior-logs', [])
  const [activityLogs = []] = useKV<ActivityLog[]>('activity-logs', [])
  const [messages = []] = useKV<Message[]>('messages', [])
  const [selectedStudentId, setSelectedStudentId] = useState<string>('')
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [showPrivacySettings, setShowPrivacySettings] = useState(false)
  usePageTracking('Student-Support-Tracker')

  // Give existing students an empty schedule if they predate that field.
  // Every hook has to run before the conditional returns below.
  useEffect(() => {
    const migrateStudents = async () => {
      if (!canRead('students')) return

      const studentsNeedingMigration = students.filter(student => !student.schedule)
      if (studentsNeedingMigration.length === 0) return

      try {
        const migratedStudents = students.map(student => {
          if (student.schedule) return student
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
        })

        await setStudents(migratedStudents)
      } catch (error) {
        console.error('Could not add schedules to existing students:', error)
      }
    }

    if (students.length > 0 && user) {
      migrateStudents()
    }
  }, [students, setStudents, user, canRead])

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Logo width={160} className="mx-auto" />
          <p className="text-muted-foreground">Loading your students</p>
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
        <header className="border-b bg-card px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Logo width={120} />
              <div>
                <h1 className="text-xl">Privacy and data protection</h1>
                <p className="text-sm text-muted-foreground">Your data, and what happens to it</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => setShowPrivacySettings(false)}>
              Back to the dashboard
            </Button>
          </div>
        </header>
        <main className="p-6">
          <PrivacySettings />
        </main>
      </div>
    )
  }

  const unreadMessages = messages.filter(m => !m.read).length

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo width={120} />
            <div>
              <h1 className="text-xl">Student Support Tracker</h1>
              <p className="text-sm text-muted-foreground">Change the environment, not the child.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {students.length} {students.length === 1 ? 'student' : 'students'}
            </Badge>
            {unreadMessages > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <ChatCircle className="h-4 w-4" />
                {unreadMessages} unread
              </Badge>
            )}
            {canCreate('students') && (
              <Button onClick={() => setShowAddStudent(true)} className="flex items-center gap-2 min-h-11">
                <Plus className="h-4 w-4" />
                Add a student
              </Button>
            )}

            {/* Account menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 min-h-11">
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
                    <p className="text-xs text-muted-foreground">{roleLabel(user?.role)}</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowPrivacySettings(true)}>
                  <Gear className="h-4 w-4 mr-2" />
                  Privacy settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <SignOut className="h-4 w-4 mr-2" />
                  Sign out
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
            <h2 className="text-2xl mb-2">Start with one student</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Add a student to begin recording their day, what helps, and what gets in the way.
            </p>
            {canCreate('students') && (
              <Button onClick={() => setShowAddStudent(true)} className="flex items-center gap-2 min-h-11">
                <Plus className="h-4 w-4" />
                Add your first student
              </Button>
            )}
          </div>
        ) : (
          <Tabs defaultValue="dashboard" className="space-y-6">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="dashboard" className="flex items-center gap-2 min-h-11">
                <Users className="h-4 w-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="schedule" className="flex items-center gap-2 min-h-11">
                <Calendar className="h-4 w-4" />
                Schedule
              </TabsTrigger>
              <TabsTrigger value="behavior" className="flex items-center gap-2 min-h-11">
                <TrendUp className="h-4 w-4" />
                Behaviour
              </TabsTrigger>
              <TabsTrigger value="communication" className="flex items-center gap-2 min-h-11">
                <ChatCircle className="h-4 w-4" />
                Messages
                {unreadMessages > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 text-xs">
                    {unreadMessages}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="activities" className="flex items-center gap-2 min-h-11">
                <Activity className="h-4 w-4" />
                Activities
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2 min-h-11">
                <ChartBar className="h-4 w-4" />
                Patterns
              </TabsTrigger>
              <TabsTrigger value="crisis" className="flex items-center gap-2 min-h-11">
                <Lifebuoy className="h-4 w-4" />
                Support plans
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

/** Irish sector job titles, spelled out in full. */
function roleLabel(role?: string): string {
  switch (role) {
    case 'sna': return 'Special Needs Assistant (SNA)'
    case 'teacher': return 'Teacher'
    case 'administrator': return 'Administrator'
    case 'substitute': return 'Substitute staff'
    default: return ''
  }
}

export default App
