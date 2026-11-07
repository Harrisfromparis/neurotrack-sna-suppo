import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Student, DailySchedule } from '@/lib/types'
import { CLASS_GROUPS } from '@/lib/schoolTerms'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, X } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface AddStudentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddStudentDialog({ open, onOpenChange }: AddStudentDialogProps) {
  const [students = [], setStudents] = useKV<Student[]>('students', [])
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    grade: '',
    careNotes: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: ''
  })
  const [supportNeeds, setSupportNeeds] = useState<string[]>([])
  const [newSupportNeed, setNewSupportNeed] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.age || !formData.grade) {
      toast.error('Some required fields are still empty')
      return
    }

    try {
      const user = await spark.user()
      
      // Create empty schedule for new student
      const newSchedule: DailySchedule = {
        id: crypto.randomUUID(),
        studentId: Date.now().toString(),
        effectiveDate: new Date().toISOString(),
        blocks: [],
        breaks: [],
        lastUpdated: new Date().toISOString(),
        updatedBy: user?.login || 'unknown',
        isActive: true
      }

      const newStudent: Student = {
        id: Date.now().toString(),
        name: formData.name,
        age: parseInt(formData.age),
        grade: formData.grade,
        supportNeeds,
        careNotes: formData.careNotes,
        emergencyContacts: formData.emergencyContactName ? [{
          id: Date.now().toString(),
          name: formData.emergencyContactName,
          phone: formData.emergencyContactPhone,
          relationship: formData.emergencyContactRelationship,
          isPrimary: true
        }] : [],
        iepGoals: [],
        schedule: newSchedule,
        createdAt: new Date().toISOString()
      }

      await setStudents(current => [...(current ?? []), newStudent])
      toast.success(`${newStudent.name} has been added`)
      
      // Reset form
      setFormData({
        name: '',
        age: '',
        grade: '',
        careNotes: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        emergencyContactRelationship: ''
      })
      setSupportNeeds([])
      setNewSupportNeed('')
      onOpenChange(false)
    } catch (error) {
      console.error('Error adding student:', error)
      toast.error('Failed to add student')
    }
  }

  const addSupportNeed = () => {
    if (newSupportNeed.trim() && !supportNeeds.includes(newSupportNeed.trim())) {
      setSupportNeeds(current => [...current, newSupportNeed.trim()])
      setNewSupportNeed('')
    }
  }

  const removeSupportNeed = (need: string) => {
    setSupportNeeds(current => current.filter(n => n !== need))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add a student</DialogTitle>
          <DialogDescription>
            Set up a profile so their day, their supports and their progress stay in one place.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Student name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="First name and surname"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="age">Age *</Label>
              <Input
                id="age"
                type="number"
                min="3"
                max="21"
                value={formData.age}
                onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
                placeholder="Age"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="grade">Class or year group *</Label>
            <Select onValueChange={(value) => setFormData(prev => ({ ...prev, grade: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a class or year group" />
              </SelectTrigger>
              <SelectContent>
                {CLASS_GROUPS.map(group => (
                  <SelectItem key={group.value} value={group.value}>{group.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Support needs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newSupportNeed}
                  onChange={(e) => setNewSupportNeed(e.target.value)}
                  placeholder="Add support need (e.g., sensory breaks, visual schedules)"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSupportNeed())}
                />
                <Button type="button" onClick={addSupportNeed} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {supportNeeds.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {supportNeeds.map((need) => (
                    <Badge key={need} variant="secondary" className="flex items-center gap-1">
                      {need}
                      <button
                        type="button"
                        onClick={() => removeSupportNeed(need)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Emergency contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactName">Contact name</Label>
                  <Input
                    id="contactName"
                    value={formData.emergencyContactName}
                    onChange={(e) => setFormData(prev => ({ ...prev, emergencyContactName: e.target.value }))}
                    placeholder="Parent/Guardian name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Phone number</Label>
                  <Input
                    id="contactPhone"
                    type="tel"
                    value={formData.emergencyContactPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, emergencyContactPhone: e.target.value }))}
                    placeholder="087 123 4567"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="relationship">Relationship</Label>
                <Select onValueChange={(value) => setFormData(prev => ({ ...prev, emergencyContactRelationship: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="parent">Parent</SelectItem>
                    <SelectItem value="guardian">Guardian</SelectItem>
                    <SelectItem value="grandparent">Grandparent</SelectItem>
                    <SelectItem value="sibling">Sibling</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label htmlFor="careNotes">Care notes</Label>
            <Textarea
              id="careNotes"
              value={formData.careNotes}
              onChange={(e) => setFormData(prev => ({ ...prev, careNotes: e.target.value }))}
              placeholder="What helps, what to watch for, and anything a substitute would need to know"
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Student</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}