import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Student, ScheduleBlock, ScheduleBreak } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, Clock, MapPin, User, Plus, Edit, Trash2 } from '@phosphor-icons/react'
import { AddScheduleBlockDialog } from './AddScheduleBlockDialog'
import { EditScheduleBlockDialog } from './EditScheduleBlockDialog'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'

interface ScheduleViewProps {
  students: Student[]
  selectedStudentId: string
  onSelectStudent: (studentId: string) => void
}

export function ScheduleView({ students, selectedStudentId, onSelectStudent }: ScheduleViewProps) {
  const [, setStudents] = useKV<Student[]>('students', [])
  const [showAddBlock, setShowAddBlock] = useState(false)
  const [editingBlock, setEditingBlock] = useState<ScheduleBlock | null>(null)
  const [viewDate, setViewDate] = useState(new Date().toISOString().split('T')[0])

  const selectedStudent = students.find(s => s.id === selectedStudentId)
  const schedule = selectedStudent?.schedule

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const date = new Date()
    date.setHours(parseInt(hours), parseInt(minutes))
    return format(date, 'h:mm a')
  }

  const getTypeColor = (type: string) => {
    const colors = {
      academic: 'bg-blue-100 text-blue-800 border-blue-200',
      therapy: 'bg-green-100 text-green-800 border-green-200',
      meal: 'bg-orange-100 text-orange-800 border-orange-200',
      recreation: 'bg-purple-100 text-purple-800 border-purple-200',
      sensory: 'bg-pink-100 text-pink-800 border-pink-200',
      transition: 'bg-gray-100 text-gray-800 border-gray-200',
      medication: 'bg-red-100 text-red-800 border-red-200',
      care: 'bg-cyan-100 text-cyan-800 border-cyan-200'
    }
    return colors[type as keyof typeof colors] || colors.academic
  }

  const getSupportColor = (support: string) => {
    const colors = {
      independent: 'bg-green-50 text-green-700',
      minimal: 'bg-yellow-50 text-yellow-700',
      moderate: 'bg-orange-50 text-orange-700',
      maximum: 'bg-red-50 text-red-700'
    }
    return colors[support as keyof typeof colors] || colors.minimal
  }

  const deleteScheduleBlock = async (blockId: string) => {
    if (!selectedStudent || !schedule) return

    try {
      const updatedBlocks = schedule.blocks.filter(block => block.id !== blockId)
      const updatedSchedule = { ...schedule, blocks: updatedBlocks }
      const updatedStudent = { ...selectedStudent, schedule: updatedSchedule }
      
      const updatedStudents = students.map(s => 
        s.id === selectedStudentId ? updatedStudent : s
      )
      
      await setStudents(updatedStudents)
      toast.success('Schedule block deleted successfully')
    } catch (error) {
      toast.error('Failed to delete schedule block')
    }
  }

  if (!selectedStudent) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Daily Schedule</h2>
            <p className="text-muted-foreground">Manage individual student schedules</p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">Select a Student</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            Choose a student from the dropdown below to view and manage their daily schedule.
          </p>
          <Select value={selectedStudentId} onValueChange={onSelectStudent}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Choose a student..." />
            </SelectTrigger>
            <SelectContent>
              {students.map(student => (
                <SelectItem key={student.id} value={student.id}>
                  {student.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    )
  }

  const sortedBlocks = schedule?.blocks.sort((a, b) => a.startTime.localeCompare(b.startTime)) || []
  const sortedBreaks = schedule?.breaks.sort((a, b) => a.startTime.localeCompare(b.startTime)) || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Daily Schedule</h2>
          <p className="text-muted-foreground">
            Managing schedule for <span className="font-medium">{selectedStudent.name}</span>
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedStudentId} onValueChange={onSelectStudent}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {students.map(student => (
                <SelectItem key={student.id} value={student.id}>
                  {student.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setShowAddBlock(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Block
          </Button>
        </div>
      </div>

      {!schedule || sortedBlocks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Schedule Created</h3>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              Create a daily schedule for {selectedStudent.name} to help track activities and provide structure.
            </p>
            <Button onClick={() => setShowAddBlock(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create First Schedule Block
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Schedule Timeline */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Daily Timeline
                </CardTitle>
                <CardDescription>
                  Scheduled activities and blocks for {selectedStudent.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sortedBlocks.map((block) => (
                    <div key={block.id} className="flex items-start gap-4 p-4 rounded-lg border">
                      <div className="text-sm font-mono text-muted-foreground min-w-[80px]">
                        {formatTime(block.startTime)}
                        <div className="text-xs">
                          {formatTime(block.endTime)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{block.title}</h4>
                          <Badge variant="outline" className={getTypeColor(block.type)}>
                            {block.type}
                          </Badge>
                          <Badge variant="secondary" className={getSupportColor(block.requiredSupport)}>
                            {block.requiredSupport}
                          </Badge>
                          {block.priority === 'critical' && (
                            <Badge variant="destructive">Critical</Badge>
                          )}
                        </div>
                        {block.description && (
                          <p className="text-sm text-muted-foreground mb-2">{block.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {block.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {block.location}
                            </div>
                          )}
                          {block.instructor && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {block.instructor}
                            </div>
                          )}
                        </div>
                        {block.objectives && block.objectives.length > 0 && (
                          <div className="mt-2">
                            <div className="text-xs text-muted-foreground mb-1">Objectives:</div>
                            <div className="flex flex-wrap gap-1">
                              {block.objectives.map((objective, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {objective}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingBlock(block)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteScheduleBlock(block.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Schedule Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Schedule Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Blocks:</span>
                    <span className="font-medium">{sortedBlocks.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Breaks:</span>
                    <span className="font-medium">{sortedBreaks.length}</span>
                  </div>
                  {schedule?.effectiveDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Effective:</span>
                      <span className="font-medium">
                        {format(parseISO(schedule.effectiveDate), 'MMM d, yyyy')}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {schedule?.specialInstructions && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Special Instructions</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {schedule.specialInstructions}
                  </p>
                </CardContent>
              </Card>
            )}

            {sortedBreaks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Scheduled Breaks</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {sortedBreaks.map((breakItem) => (
                    <div key={breakItem.id} className="flex items-center justify-between text-sm">
                      <span>{breakItem.title}</span>
                      <span className="text-muted-foreground">
                        {formatTime(breakItem.startTime)}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      <AddScheduleBlockDialog
        open={showAddBlock}
        onOpenChange={setShowAddBlock}
        studentId={selectedStudentId}
        students={students}
      />

      {editingBlock && (
        <EditScheduleBlockDialog
          open={!!editingBlock}
          onOpenChange={() => setEditingBlock(null)}
          block={editingBlock}
          studentId={selectedStudentId}
          students={students}
        />
      )}
    </div>
  )
}