import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Student, CrisisProtocol } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Shield, Plus, AlertTriangle, Phone, Clock, CheckCircle } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface CrisisManagementProps {
  students: Student[]
  selectedStudentId: string
  onSelectStudent: (id: string) => void
}

export function CrisisManagement({ students, selectedStudentId, onSelectStudent }: CrisisManagementProps) {
  const [crisisProtocols, setCrisisProtocols] = useKV<CrisisProtocol[]>('crisis-protocols', [])
  const [showAddProtocol, setShowAddProtocol] = useState(false)
  const [activeEmergency, setActiveEmergency] = useState<string | null>(null)
  const [newProtocol, setNewProtocol] = useState({
    studentId: selectedStudentId,
    triggerSigns: [''],
    deEscalationSteps: [''],
    emergencyProcedure: ''
  })

  const selectedStudent = students.find(s => s.id === selectedStudentId)
  const studentProtocol = crisisProtocols.find(protocol => protocol.studentId === selectedStudentId)

  const handleAddProtocol = () => {
    if (!newProtocol.studentId || !newProtocol.emergencyProcedure) {
      toast.error('Please fill in required fields')
      return
    }

    const protocol: CrisisProtocol = {
      id: Date.now().toString(),
      ...newProtocol,
      triggerSigns: newProtocol.triggerSigns.filter(sign => sign.trim()),
      deEscalationSteps: newProtocol.deEscalationSteps.filter(step => step.trim()),
      lastUpdated: new Date().toISOString()
    }

    setCrisisProtocols(current => {
      const existing = current.find(p => p.studentId === newProtocol.studentId)
      if (existing) {
        return current.map(p => p.studentId === newProtocol.studentId ? protocol : p)
      }
      return [...current, protocol]
    })

    toast.success('Crisis protocol saved successfully')
    setShowAddProtocol(false)
    resetForm()
  }

  const resetForm = () => {
    setNewProtocol({
      studentId: selectedStudentId,
      triggerSigns: [''],
      deEscalationSteps: [''],
      emergencyProcedure: ''
    })
  }

  const addTriggerSign = () => {
    setNewProtocol(prev => ({
      ...prev,
      triggerSigns: [...prev.triggerSigns, '']
    }))
  }

  const updateTriggerSign = (index: number, value: string) => {
    setNewProtocol(prev => ({
      ...prev,
      triggerSigns: prev.triggerSigns.map((sign, i) => i === index ? value : sign)
    }))
  }

  const removeTriggerSign = (index: number) => {
    setNewProtocol(prev => ({
      ...prev,
      triggerSigns: prev.triggerSigns.filter((_, i) => i !== index)
    }))
  }

  const addDeEscalationStep = () => {
    setNewProtocol(prev => ({
      ...prev,
      deEscalationSteps: [...prev.deEscalationSteps, '']
    }))
  }

  const updateDeEscalationStep = (index: number, value: string) => {
    setNewProtocol(prev => ({
      ...prev,
      deEscalationSteps: prev.deEscalationSteps.map((step, i) => i === index ? value : step)
    }))
  }

  const removeDeEscalationStep = (index: number) => {
    setNewProtocol(prev => ({
      ...prev,
      deEscalationSteps: prev.deEscalationSteps.filter((_, i) => i !== index)
    }))
  }

  const activateEmergency = (studentId: string) => {
    setActiveEmergency(studentId)
    toast.error('Emergency protocols activated!')
  }

  const deactivateEmergency = () => {
    setActiveEmergency(null)
    toast.success('Emergency situation resolved')
  }

  if (!selectedStudent) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold mb-2">Crisis Management</h2>
          <p className="text-muted-foreground">Select a student to manage their crisis protocols</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {students.map((student) => {
            const hasProtocol = crisisProtocols.some(protocol => protocol.studentId === student.id)
            
            return (
              <Card 
                key={student.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => onSelectStudent(student.id)}
              >
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    {student.name}
                    {hasProtocol ? (
                      <Badge variant="secondary">
                        <Shield className="h-3 w-3 mr-1" />
                        Protocol Ready
                      </Badge>
                    ) : (
                      <Badge variant="outline">No Protocol</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>Age {student.age} • {student.grade}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    variant={hasProtocol ? "secondary" : "destructive"} 
                    size="sm"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (hasProtocol) {
                        activateEmergency(student.id)
                      } else {
                        toast.error('No crisis protocol available for this student')
                      }
                    }}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Emergency Alert
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {activeEmergency === selectedStudent.id && (
        <Alert className="border-destructive bg-destructive/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-destructive">EMERGENCY ACTIVE</AlertTitle>
          <AlertDescription className="text-destructive">
            Crisis protocols are currently active for {selectedStudent.name}. Follow established procedures.
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-4"
              onClick={deactivateEmergency}
            >
              Mark as Resolved
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">{selectedStudent.name} - Crisis Management</h2>
          <p className="text-muted-foreground">Emergency protocols and crisis response procedures</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onSelectStudent('')}>
            Back to Students
          </Button>
          <Button 
            variant="destructive"
            onClick={() => activateEmergency(selectedStudent.id)}
            className="flex items-center gap-2"
          >
            <AlertTriangle className="h-4 w-4" />
            EMERGENCY
          </Button>
          <Dialog open={showAddProtocol} onOpenChange={setShowAddProtocol}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                {studentProtocol ? 'Edit Protocol' : 'Add Protocol'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {studentProtocol ? 'Edit' : 'Create'} Crisis Protocol for {selectedStudent.name}
                </DialogTitle>
                <DialogDescription>
                  Set up emergency procedures and de-escalation strategies
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Trigger Signs</CardTitle>
                    <CardDescription>Early warning signs that indicate escalation</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {newProtocol.triggerSigns.map((sign, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={sign}
                          onChange={(e) => updateTriggerSign(index, e.target.value)}
                          placeholder="e.g., Increased fidgeting, verbal outbursts, withdrawal"
                        />
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => removeTriggerSign(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" onClick={addTriggerSign}>
                      Add Trigger Sign
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">De-escalation Steps</CardTitle>
                    <CardDescription>Step-by-step intervention procedures</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {newProtocol.deEscalationSteps.map((step, index) => (
                      <div key={index} className="flex gap-2">
                        <div className="flex-1">
                          <Label className="text-sm">Step {index + 1}</Label>
                          <Textarea
                            value={step}
                            onChange={(e) => updateDeEscalationStep(index, e.target.value)}
                            placeholder="Describe the intervention step"
                            rows={2}
                          />
                        </div>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => removeDeEscalationStep(index)}
                          className="mt-6"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" onClick={addDeEscalationStep}>
                      Add De-escalation Step
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Emergency Procedure</CardTitle>
                    <CardDescription>Actions to take in crisis situations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={newProtocol.emergencyProcedure}
                      onChange={(e) => setNewProtocol(prev => ({ ...prev, emergencyProcedure: e.target.value }))}
                      placeholder="Detailed emergency response procedure including who to contact and immediate actions..."
                      rows={6}
                      required
                    />
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAddProtocol(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddProtocol}>
                    {studentProtocol ? 'Update' : 'Save'} Protocol
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Emergency Contacts
            </CardTitle>
            <CardDescription>Quick access to important contacts</CardDescription>
          </CardHeader>
          <CardContent>
            {selectedStudent.emergencyContacts.length > 0 ? (
              <div className="space-y-3">
                {selectedStudent.emergencyContacts.map((contact) => (
                  <div key={contact.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{contact.name}</div>
                      <div className="text-sm text-muted-foreground">{contact.relationship}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono">{contact.phone}</div>
                      <Button size="sm" variant="outline" className="mt-1">
                        <Phone className="h-3 w-3 mr-1" />
                        Call
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No emergency contacts added</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>Immediate response options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="destructive" 
              className="w-full"
              onClick={() => activateEmergency(selectedStudent.id)}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Activate Emergency Protocol
            </Button>
            <Button variant="outline" className="w-full">
              <Phone className="h-4 w-4 mr-2" />
              Call School Administration
            </Button>
            <Button variant="outline" className="w-full">
              <CheckCircle className="h-4 w-4 mr-2" />
              Log Crisis Incident
            </Button>
          </CardContent>
        </Card>
      </div>

      {studentProtocol && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Active Crisis Protocol
              </CardTitle>
              <CardDescription>
                Last updated: {new Date(studentProtocol.lastUpdated).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-medium mb-3">Trigger Signs</h4>
                <div className="space-y-2">
                  {studentProtocol.triggerSigns.map((sign, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <span>{sign}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">De-escalation Steps</h4>
                <div className="space-y-3">
                  {studentProtocol.deEscalationSteps.map((step, index) => (
                    <div key={index} className="flex gap-3">
                      <Badge variant="outline">{index + 1}</Badge>
                      <p className="flex-1">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Emergency Procedure</h4>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="whitespace-pre-wrap">{studentProtocol.emergencyProcedure}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!studentProtocol && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              No Crisis Protocol
            </CardTitle>
            <CardDescription>
              This student does not have a crisis management protocol set up
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Creating a crisis protocol helps ensure consistent and effective responses during challenging situations.
            </p>
            <Button onClick={() => setShowAddProtocol(true)}>
              Create Crisis Protocol
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}