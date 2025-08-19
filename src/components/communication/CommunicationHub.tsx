import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Student, Message } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { MessageCircle, Plus, Send, Clock, AlertCircle } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface CommunicationHubProps {
  students: Student[]
  selectedStudentId: string
  onSelectStudent: (id: string) => void
}

export function CommunicationHub({ students, selectedStudentId, onSelectStudent }: CommunicationHubProps) {
  const [messages, setMessages] = useKV<Message[]>('messages', [])
  const [showNewMessage, setShowNewMessage] = useState(false)
  const [newMessage, setNewMessage] = useState({
    studentId: '',
    to: '',
    subject: '',
    content: '',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    type: 'general' as 'general' | 'incident' | 'progress' | 'health'
  })

  const selectedStudent = students.find(s => s.id === selectedStudentId)
  const studentMessages = selectedStudentId ? 
    messages.filter(msg => msg.studentId === selectedStudentId) : 
    messages

  // Update form when student changes
  useEffect(() => {
    setNewMessage(prev => ({
      ...prev,
      studentId: selectedStudentId || ''
    }))
  }, [selectedStudentId])

  const handleSendMessage = () => {
    if (!newMessage.to || !newMessage.subject || !newMessage.content) {
      toast.error('Please fill in all required fields')
      return
    }

    const message: Message = {
      id: Date.now().toString(),
      ...newMessage,
      from: 'SNA Assistant',
      to: [newMessage.to],
      timestamp: new Date().toISOString(),
      read: false
    }

    setMessages(current => [...current, message])
    toast.success('Message sent successfully')
    
    setNewMessage({
      studentId: selectedStudentId || '',
      to: '',
      subject: '',
      content: '',
      priority: 'normal',
      type: 'general'
    })
    setShowNewMessage(false)
  }

  const markAsRead = (messageId: string) => {
    setMessages(current => 
      current.map(msg => 
        msg.id === messageId ? { ...msg, read: true } : msg
      )
    )
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-destructive text-destructive-foreground'
      case 'high': return 'bg-accent text-accent-foreground'
      case 'normal': return 'bg-secondary text-secondary-foreground'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'incident': return <AlertCircle className="h-4 w-4" />
      case 'progress': return <Clock className="h-4 w-4" />
      case 'health': return <AlertCircle className="h-4 w-4" />
      default: return <MessageCircle className="h-4 w-4" />
    }
  }

  if (!selectedStudent && selectedStudentId) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold mb-2">Communication Hub</h2>
          <p className="text-muted-foreground">Select a student to view their communication history</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">
            {selectedStudent ? `${selectedStudent.name} - Messages` : 'Communication Hub'}
          </h2>
          <p className="text-muted-foreground">
            {selectedStudent ? 'Student-specific communication' : 'All communication and messages'}
          </p>
        </div>
        <div className="flex gap-2">
          {selectedStudent && (
            <Button variant="outline" onClick={() => onSelectStudent('')}>
              Back to All Messages
            </Button>
          )}
          <Dialog open={showNewMessage} onOpenChange={setShowNewMessage}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New Message
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Send New Message</DialogTitle>
                <DialogDescription>
                  Communicate with teachers, parents, or support staff
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Student (Optional)</Label>
                    <Select 
                      value={newMessage.studentId} 
                      onValueChange={(value) => setNewMessage(prev => ({ ...prev, studentId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select student" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No specific student</SelectItem>
                        {students.map((student) => (
                          <SelectItem key={student.id} value={student.id}>
                            {student.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Recipient *</Label>
                    <Select onValueChange={(value) => setNewMessage(prev => ({ ...prev, to: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select recipient" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="teacher">Classroom Teacher</SelectItem>
                        <SelectItem value="parent">Parent/Guardian</SelectItem>
                        <SelectItem value="principal">Principal</SelectItem>
                        <SelectItem value="counselor">School Counselor</SelectItem>
                        <SelectItem value="nurse">School Nurse</SelectItem>
                        <SelectItem value="therapist">Therapist</SelectItem>
                        <SelectItem value="coordinator">Special Ed Coordinator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Message Type</Label>
                    <Select onValueChange={(value: any) => setNewMessage(prev => ({ ...prev, type: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="incident">Incident Report</SelectItem>
                        <SelectItem value="progress">Progress Update</SelectItem>
                        <SelectItem value="health">Health/Medical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select onValueChange={(value: any) => setNewMessage(prev => ({ ...prev, priority: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Subject *</Label>
                  <Input
                    value={newMessage.subject}
                    onChange={(e) => setNewMessage(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Message subject"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Message *</Label>
                  <Textarea
                    value={newMessage.content}
                    onChange={(e) => setNewMessage(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Type your message here..."
                    rows={6}
                    required
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowNewMessage(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSendMessage} className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Send Message
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {!selectedStudent && students.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {students.map((student) => {
            const studentMsgCount = messages.filter(msg => msg.studentId === student.id).length
            const unreadCount = messages.filter(msg => msg.studentId === student.id && !msg.read).length
            
            return (
              <Card 
                key={student.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => onSelectStudent(student.id)}
              >
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    {student.name}
                    {unreadCount > 0 && (
                      <Badge variant="destructive">{unreadCount}</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>Age {student.age} • {student.grade}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    {studentMsgCount} total messages
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            {selectedStudent ? `Messages for ${selectedStudent.name}` : 'All Messages'}
          </CardTitle>
          <CardDescription>
            Communication history and correspondence
          </CardDescription>
        </CardHeader>
        <CardContent>
          {studentMessages.length > 0 ? (
            <div className="space-y-4">
              {studentMessages
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .map((message) => (
                  <div 
                    key={message.id} 
                    className={`border rounded-lg p-4 space-y-3 ${!message.read ? 'bg-muted/50' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(message.type)}
                        <span className="font-medium">{message.subject}</span>
                        <Badge className={getPriorityColor(message.priority)}>
                          {message.priority}
                        </Badge>
                        <Badge variant="outline">{message.type}</Badge>
                        {!message.read && (
                          <Badge variant="destructive" className="text-xs">New</Badge>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(message.timestamp).toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="text-sm">
                      <div className="flex justify-between mb-2">
                        <span><strong>From:</strong> {message.from}</span>
                        <span><strong>To:</strong> {message.to.join(', ')}</span>
                      </div>
                    </div>

                    <div className="text-sm">
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>

                    {!message.read && (
                      <div className="pt-2 border-t">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => markAsRead(message.id)}
                        >
                          Mark as Read
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No messages found</p>
              <p className="text-sm text-muted-foreground">Click "New Message" to start communicating</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}