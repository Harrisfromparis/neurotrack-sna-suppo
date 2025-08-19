import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Student, ScheduleBlock, DailySchedule } from '@/lib/types'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { X } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface AddScheduleBlockDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  studentId: string
  students: Student[]
}

export function AddScheduleBlockDialog({ open, onOpenChange, studentId, students }: AddScheduleBlockDialogProps) {
  const [, setStudents] = useKV<Student[]>('students', [])
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    startTime: '',
    endTime: '',
    type: '',
    location: '',
    instructor: '',
    description: '',
    objectives: [] as string[],
    accommodations: [] as string[],
    requiredSupport: '',
    isRecurring: false,
    recurringDays: [] as string[],
    materials: [] as string[],
    preparationNotes: '',
    priority: 'medium'
  })
  const [newObjective, setNewObjective] = useState('')
  const [newAccommodation, setNewAccommodation] = useState('')
  const [newMaterial, setNewMaterial] = useState('')

  const selectedStudent = students.find(s => s.id === studentId)

  const resetForm = () => {
    setFormData({
      title: '',
      startTime: '',
      endTime: '',
      type: '',
      location: '',
      instructor: '',
      description: '',
      objectives: [],
      accommodations: [],
      requiredSupport: '',
      isRecurring: false,
      recurringDays: [],
      materials: [],
      preparationNotes: '',
      priority: 'medium'
    })
    setNewObjective('')
    setNewAccommodation('')
    setNewMaterial('')
  }

  const addObjective = () => {
    if (newObjective.trim()) {
      setFormData(prev => ({
        ...prev,
        objectives: [...prev.objectives, newObjective.trim()]
      }))
      setNewObjective('')
    }
  }

  const removeObjective = (index: number) => {
    setFormData(prev => ({
      ...prev,
      objectives: prev.objectives.filter((_, i) => i !== index)
    }))
  }

  const addAccommodation = () => {
    if (newAccommodation.trim()) {
      setFormData(prev => ({
        ...prev,
        accommodations: [...prev.accommodations, newAccommodation.trim()]
      }))
      setNewAccommodation('')
    }
  }

  const removeAccommodation = (index: number) => {
    setFormData(prev => ({
      ...prev,
      accommodations: prev.accommodations.filter((_, i) => i !== index)
    }))
  }

  const addMaterial = () => {
    if (newMaterial.trim()) {
      setFormData(prev => ({
        ...prev,
        materials: [...prev.materials, newMaterial.trim()]
      }))
      setNewMaterial('')
    }
  }

  const removeMaterial = (index: number) => {
    setFormData(prev => ({
      ...prev,
      materials: prev.materials.filter((_, i) => i !== index)
    }))
  }

  const handleRecurringDayChange = (day: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      recurringDays: checked
        ? [...prev.recurringDays, day]
        : prev.recurringDays.filter(d => d !== day)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStudent) return

    if (!formData.title || !formData.startTime || !formData.endTime || !formData.type || !formData.requiredSupport) {
      toast.error('Please fill in all required fields')
      return
    }

    if (formData.startTime >= formData.endTime) {
      toast.error('End time must be after start time')
      return
    }

    setIsLoading(true)

    try {
      const user = await spark.user()
      const newBlock: ScheduleBlock = {
        id: crypto.randomUUID(),
        title: formData.title,
        startTime: formData.startTime,
        endTime: formData.endTime,
        type: formData.type as any,
        location: formData.location,
        instructor: formData.instructor || undefined,
        description: formData.description || undefined,
        objectives: formData.objectives.length > 0 ? formData.objectives : undefined,
        accommodations: formData.accommodations.length > 0 ? formData.accommodations : undefined,
        requiredSupport: formData.requiredSupport as any,
        isRecurring: formData.isRecurring,
        recurringDays: formData.isRecurring && formData.recurringDays.length > 0 ? formData.recurringDays as any : undefined,
        materials: formData.materials.length > 0 ? formData.materials : undefined,
        preparationNotes: formData.preparationNotes || undefined,
        priority: formData.priority as any
      }

      let updatedSchedule: DailySchedule

      if (selectedStudent.schedule) {
        // Add to existing schedule
        updatedSchedule = {
          ...selectedStudent.schedule,
          blocks: [...selectedStudent.schedule.blocks, newBlock],
          lastUpdated: new Date().toISOString(),
          updatedBy: user?.login || 'unknown'
        }
      } else {
        // Create new schedule
        updatedSchedule = {
          id: crypto.randomUUID(),
          studentId: studentId,
          effectiveDate: new Date().toISOString(),
          blocks: [newBlock],
          breaks: [],
          lastUpdated: new Date().toISOString(),
          updatedBy: user?.login || 'unknown',
          isActive: true
        }
      }

      const updatedStudent = { ...selectedStudent, schedule: updatedSchedule }
      const updatedStudents = students.map(s => 
        s.id === studentId ? updatedStudent : s
      )

      await setStudents(updatedStudents)
      toast.success('Schedule block added successfully')
      resetForm()
      onOpenChange(false)
    } catch (error) {
      console.error('Error adding schedule block:', error)
      toast.error('Failed to add schedule block')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      resetForm()
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Schedule Block</DialogTitle>
          <DialogDescription>
            Create a new schedule block for {selectedStudent?.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Math Class, Lunch, Therapy"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="academic">Academic</SelectItem>
                  <SelectItem value="therapy">Therapy</SelectItem>
                  <SelectItem value="meal">Meal</SelectItem>
                  <SelectItem value="recreation">Recreation</SelectItem>
                  <SelectItem value="sensory">Sensory</SelectItem>
                  <SelectItem value="transition">Transition</SelectItem>
                  <SelectItem value="medication">Medication</SelectItem>
                  <SelectItem value="care">Care</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Time and Location */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time *</Label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time *</Label>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="e.g., Classroom A, Gym"
              />
            </div>
          </div>

          {/* Support and Priority */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="requiredSupport">Required Support *</Label>
              <Select value={formData.requiredSupport} onValueChange={(value) => setFormData(prev => ({ ...prev, requiredSupport: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select support level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="independent">Independent</SelectItem>
                  <SelectItem value="minimal">Minimal</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="maximum">Maximum</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="instructor">Instructor/Staff</Label>
              <Input
                id="instructor"
                value={formData.instructor}
                onChange={(e) => setFormData(prev => ({ ...prev, instructor: e.target.value }))}
                placeholder="e.g., Ms. Smith"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of the activity..."
              className="resize-none"
              rows={2}
            />
          </div>

          {/* Objectives */}
          <div className="space-y-2">
            <Label>Learning Objectives</Label>
            <div className="flex gap-2">
              <Input
                value={newObjective}
                onChange={(e) => setNewObjective(e.target.value)}
                placeholder="Add an objective..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addObjective())}
              />
              <Button type="button" onClick={addObjective} variant="outline">
                Add
              </Button>
            </div>
            {formData.objectives.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.objectives.map((objective, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {objective}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => removeObjective(index)} />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Accommodations */}
          <div className="space-y-2">
            <Label>Accommodations</Label>
            <div className="flex gap-2">
              <Input
                value={newAccommodation}
                onChange={(e) => setNewAccommodation(e.target.value)}
                placeholder="Add an accommodation..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAccommodation())}
              />
              <Button type="button" onClick={addAccommodation} variant="outline">
                Add
              </Button>
            </div>
            {formData.accommodations.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.accommodations.map((accommodation, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {accommodation}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => removeAccommodation(index)} />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Materials */}
          <div className="space-y-2">
            <Label>Required Materials</Label>
            <div className="flex gap-2">
              <Input
                value={newMaterial}
                onChange={(e) => setNewMaterial(e.target.value)}
                placeholder="Add required materials..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMaterial())}
              />
              <Button type="button" onClick={addMaterial} variant="outline">
                Add
              </Button>
            </div>
            {formData.materials.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.materials.map((material, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {material}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => removeMaterial(index)} />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Recurring Settings */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isRecurring"
                checked={formData.isRecurring}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isRecurring: checked as boolean }))}
              />
              <Label htmlFor="isRecurring">Recurring schedule block</Label>
            </div>

            {formData.isRecurring && (
              <div className="space-y-2">
                <Label>Recurring Days</Label>
                <div className="flex gap-2 flex-wrap">
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map((day) => (
                    <div key={day} className="flex items-center space-x-2">
                      <Checkbox
                        id={day}
                        checked={formData.recurringDays.includes(day)}
                        onCheckedChange={(checked) => handleRecurringDayChange(day, checked as boolean)}
                      />
                      <Label htmlFor={day} className="capitalize">
                        {day}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Preparation Notes */}
          <div className="space-y-2">
            <Label htmlFor="preparationNotes">Preparation Notes</Label>
            <Textarea
              id="preparationNotes"
              value={formData.preparationNotes}
              onChange={(e) => setFormData(prev => ({ ...prev, preparationNotes: e.target.value }))}
              placeholder="Any special preparation needed..."
              className="resize-none"
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Adding...' : 'Add Schedule Block'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}