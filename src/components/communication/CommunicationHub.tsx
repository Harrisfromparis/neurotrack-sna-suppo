import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Student, Message, MessageRecipient, Attachment, MLAnalysis } from '@/lib/types'
import { mlService } from '@/lib/ml'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { MessageCircle, Plus, Send, Clock, AlertCircle, Eye, EyeSlash, Reply, Forward, Paperclip } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useLogging, useFormTracking } from '@/hooks/useLogging'
import { getCurrentSessionId } from '@/lib/logging'

interface CommunicationHubProps {
  students: Student[]
  selectedStudentId: string
  onSelectStudent: (id: string) => void
}

export function CommunicationHub({ students, selectedStudentId, onSelectStudent }: CommunicationHubProps) {
  const [messages, setMessages] = useKV<Message[]>('messages', [])
  const [showNewMessage, setShowNewMessage] = useState(false)
  const [mlAnalysis, setMlAnalysis] = useState<MLAnalysis | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showMLSuggestions, setShowMLSuggestions] = useState(false)
  const { logAction, logError } = useLogging()
  const { trackFormStart, trackFieldInteraction, trackFormSubmit, trackValidationError } = useFormTracking('message-form')
  
  const [newMessage, setNewMessage] = useState({
    studentId: '',
    to: [] as string[],
    subject: '',
    content: '',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    type: 'general' as 'general' | 'incident' | 'progress' | 'health' | 'behavior' | 'academic' | 'safety',
    confidential: false,
    requiresResponse: false,
    responseDeadline: '',
    replyToId: '',
    tags: [] as string[]
  })

  const selectedStudent = students.find(s => s.id === selectedStudentId)
  const studentMessages = selectedStudentId ? 
    messages.filter(msg => msg.studentId === selectedStudentId) : 
    messages

  // Common recipients for quick selection
  const recipientOptions = [
    'classroom-teacher', 'parent-guardian', 'principal', 'school-counselor',
    'school-nurse', 'therapist', 'special-ed-coordinator', 'speech-therapist',
    'occupational-therapist', 'behavioral-specialist', 'administrator'
  ]

  const messageTags = [
    'urgent', 'follow-up-needed', 'medical', 'behavioral', 'academic',
    'social', 'transportation', 'iep', 'accommodation', 'parent-meeting'
  ]

  // Update form when student changes
  useEffect(() => {
    setNewMessage(prev => ({
      ...prev,
      studentId: selectedStudentId || ''
    }))
  }, [selectedStudentId])

  // Log component usage
  useEffect(() => {
    logAction('view_communication_hub', selectedStudentId || 'all_messages')
  }, [selectedStudentId, logAction])

  // Initialize ML service
  useEffect(() => {
    const initializeML = async () => {
      try {
        await mlService.initialize()
      } catch (error) {
        logError('ml_initialization_failed', { error: error instanceof Error ? error.message : 'Unknown error' })
      }
    }
    initializeML()
  }, [logError])

  // Analyze message content for ML insights
  const analyzeMessageContent = async (content: string) => {
    if (!content.trim()) {
      setMlAnalysis(null)
      return
    }

    setIsAnalyzing(true)
    try {
      const analysis = await mlService.analyzeMessage(content, {
        studentId: selectedStudentId,
        senderRole: 'sna'
      })
      
      setMlAnalysis(analysis)
      
      // Auto-adjust priority based on urgency score
      if (analysis.urgencyScore >= 8 && newMessage.priority !== 'urgent') {
        setNewMessage(prev => ({ ...prev, priority: 'urgent' }))
        toast.info('Message priority auto-adjusted to urgent based on content analysis')
      } else if (analysis.urgencyScore >= 6 && newMessage.priority === 'normal') {
        setNewMessage(prev => ({ ...prev, priority: 'high' }))
        toast.info('Message priority auto-adjusted to high based on content analysis')
      }

      // Auto-categorize message type based on intents
      const primaryIntent = analysis.intents[0]
      if (primaryIntent) {
        const typeMapping = {
          crisis: 'safety',
          medical: 'health', 
          behavioral: 'behavior',
          academic: 'academic',
          support: 'general',
          routine: 'general'
        }
        
        const suggestedType = typeMapping[primaryIntent.category] as typeof newMessage.type
        if (suggestedType !== newMessage.type) {
          setNewMessage(prev => ({ ...prev, type: suggestedType }))
        }
      }

      // Suggest response requirements for high urgency
      if (analysis.urgencyScore >= 7 && !newMessage.requiresResponse) {
        setNewMessage(prev => ({ 
          ...prev, 
          requiresResponse: true,
          responseDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Tomorrow
        }))
      }

    } catch (error) {
      logError('ml_analysis_failed', { error: error instanceof Error ? error.message : 'Unknown error' })
      setMlAnalysis(null)
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Trigger ML analysis when content changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (newMessage.content.length > 10) { // Only analyze substantial content
        analyzeMessageContent(newMessage.content)
      } else {
        setMlAnalysis(null)
      }
    }, 1000) // Debounce analysis

    return () => clearTimeout(timeoutId)
  }, [newMessage.content])

  const handleSendMessage = async () => {
    trackFormStart()
    
    // Validation
    if (!newMessage.to.length || !newMessage.subject || !newMessage.content) {
      const missingFields = []
      if (!newMessage.to.length) missingFields.push('recipient')
      if (!newMessage.subject) missingFields.push('subject')
      if (!newMessage.content) missingFields.push('content')
      
      trackValidationError('required-fields', `Missing: ${missingFields.join(', ')}`)
      toast.error('Please fill in all required fields')
      return
    }

    try {
      const sessionId = getCurrentSessionId() || 'no-session'
      const currentUser = await spark.user()
      const timestamp = new Date().toISOString()
      
      // Create recipient objects with tracking
      const recipients: MessageRecipient[] = newMessage.to.map(recipientType => ({
        userId: recipientType,
        name: recipientType.replace('-', ' '),
        role: recipientType,
        status: 'pending'
      }))

      const message: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        studentId: newMessage.studentId || undefined,
        from: currentUser?.login || 'SNA-Assistant',
        to: newMessage.to,
        subject: newMessage.subject,
        content: newMessage.content,
        priority: newMessage.priority,
        timestamp,
        read: false,
        type: newMessage.type,
        // Enhanced tracking fields
        sessionId,
        sentTimestamp: timestamp,
        status: 'sent',
        recipients,
        confidential: newMessage.confidential,
        requiresResponse: newMessage.requiresResponse,
        responseDeadline: newMessage.responseDeadline || undefined,
        responseReceived: false,
        tags: newMessage.tags,
        deviceInfo: {
          type: /Mobile|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
          os: /Mac/i.test(navigator.userAgent) ? 'macOS' : /Windows/i.test(navigator.userAgent) ? 'Windows' : 'Unknown',
          userAgent: navigator.userAgent
        },
        encryption: newMessage.confidential,
        replyToId: newMessage.replyToId || undefined,
        importance: newMessage.priority === 'urgent' ? 5 : newMessage.priority === 'high' ? 4 : 3,
        // ML Analysis data
        mlAnalysis,
        autoAdjustedPriority: mlAnalysis?.urgencyScore ? mlAnalysis.urgencyScore >= 6 : false,
        autoSuggestedType: mlAnalysis?.intents.length ? mlAnalysis.intents.length > 0 : false
      }

      setMessages(current => [...current, message])
      
      // Log message creation
      logAction('message_sent', selectedStudentId || 'general', {
        messageType: message.type,
        priority: message.priority,
        recipientCount: recipients.length,
        isConfidential: message.confidential,
        requiresResponse: message.requiresResponse,
        hasDeadline: !!message.responseDeadline,
        tagsCount: message.tags.length
      })
      
      trackFormSubmit({
        messageType: message.type,
        priority: message.priority,
        recipientCount: recipients.length,
        hasStudentId: !!message.studentId
      }, true)
      
      toast.success('Message sent successfully')
      
      // Reset form
      setNewMessage({
        studentId: selectedStudentId || '',
        to: [],
        subject: '',
        content: '',
        priority: 'normal',
        type: 'general',
        confidential: false,
        requiresResponse: false,
        responseDeadline: '',
        replyToId: '',
        tags: []
      })
      setShowNewMessage(false)
    } catch (error) {
      logError('message_send', error?.toString() || 'Unknown error', selectedStudentId)
      trackFormSubmit({}, false)
      toast.error('Failed to send message')
    }
  }

  const markAsRead = async (messageId: string) => {
    const readTimestamp = new Date().toISOString()
    
    setMessages(current => 
      current.map(msg => 
        msg.id === messageId 
          ? { 
              ...msg, 
              read: true, 
              readTimestamp,
              status: 'read' as const
            } 
          : msg
      )
    )
    
    logAction('message_read', messageId, {
      studentId: selectedStudentId
    })
    
    toast.success('Message marked as read')
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
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Send New Message</DialogTitle>
                <DialogDescription>
                  Communicate with teachers, parents, or support staff with comprehensive tracking
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Message Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Student (Optional)</Label>
                      <Select 
                        value={newMessage.studentId} 
                        onValueChange={(value) => {
                          setNewMessage(prev => ({ ...prev, studentId: value }))
                          trackFieldInteraction('student')
                        }}
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
                      <Label>Message Type</Label>
                      <Select 
                        onValueChange={(value: any) => {
                          setNewMessage(prev => ({ ...prev, type: value }))
                          trackFieldInteraction('type')
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="incident">Incident Report</SelectItem>
                          <SelectItem value="progress">Progress Update</SelectItem>
                          <SelectItem value="health">Health/Medical</SelectItem>
                          <SelectItem value="behavior">Behavior Update</SelectItem>
                          <SelectItem value="academic">Academic</SelectItem>
                          <SelectItem value="safety">Safety Concern</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Recipients */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Recipients *</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                    {recipientOptions.map((recipient) => (
                      <div key={recipient} className="flex items-center space-x-2">
                        <Checkbox
                          id={recipient}
                          checked={newMessage.to.includes(recipient)}
                          onCheckedChange={(checked) => {
                            setNewMessage(prev => ({
                              ...prev,
                              to: checked
                                ? [...prev.to, recipient]
                                : prev.to.filter(r => r !== recipient)
                            }))
                            trackFieldInteraction('recipients')
                          }}
                        />
                        <Label htmlFor={recipient} className="text-sm">
                          {recipient.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Priority and Settings */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Priority & Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select 
                        onValueChange={(value: any) => {
                          setNewMessage(prev => ({ ...prev, priority: value }))
                          trackFieldInteraction('priority')
                        }}
                      >
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

                    <div className="space-y-2">
                      <Label>Response Deadline (Optional)</Label>
                      <Input
                        type="datetime-local"
                        value={newMessage.responseDeadline}
                        onChange={(e) => {
                          setNewMessage(prev => ({ ...prev, responseDeadline: e.target.value }))
                          trackFieldInteraction('deadline')
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-3 mt-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="confidential"
                        checked={newMessage.confidential}
                        onCheckedChange={(checked) => {
                          setNewMessage(prev => ({ ...prev, confidential: !!checked }))
                          trackFieldInteraction('confidential')
                        }}
                      />
                      <Label htmlFor="confidential">Mark as confidential</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="requiresResponse"
                        checked={newMessage.requiresResponse}
                        onCheckedChange={(checked) => {
                          setNewMessage(prev => ({ ...prev, requiresResponse: !!checked }))
                          trackFieldInteraction('requires-response')
                        }}
                      />
                      <Label htmlFor="requiresResponse">Response required</Label>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Tags</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 max-h-32 overflow-y-auto">
                    {messageTags.map((tag) => (
                      <div key={tag} className="flex items-center space-x-2">
                        <Checkbox
                          id={tag}
                          checked={newMessage.tags.includes(tag)}
                          onCheckedChange={(checked) => {
                            setNewMessage(prev => ({
                              ...prev,
                              tags: checked
                                ? [...prev.tags, tag]
                                : prev.tags.filter(t => t !== tag)
                            }))
                            trackFieldInteraction('tags')
                          }}
                        />
                        <Label htmlFor={tag} className="text-sm">
                          {tag.replace('-', ' ')}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Message Content */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Content</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Subject *</Label>
                      <Input
                        value={newMessage.subject}
                        onChange={(e) => {
                          setNewMessage(prev => ({ ...prev, subject: e.target.value }))
                          trackFieldInteraction('subject')
                        }}
                        placeholder="Message subject"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Message *</Label>
                      <Textarea
                        value={newMessage.content}
                        onChange={(e) => {
                          setNewMessage(prev => ({ ...prev, content: e.target.value }))
                          trackFieldInteraction('content')
                        }}
                        placeholder="Type your message here..."
                        rows={6}
                        required
                      />
                      
                      {/* ML Analysis Display */}
                      {(isAnalyzing || mlAnalysis) && (
                        <div className="mt-3 p-3 bg-muted/50 rounded-md border">
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-sm font-medium">🤖 AI Analysis</Label>
                            {mlAnalysis && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowMLSuggestions(!showMLSuggestions)}
                                className="text-xs"
                              >
                                {showMLSuggestions ? 'Hide Details' : 'Show Details'}
                              </Button>
                            )}
                          </div>
                          
                          {isAnalyzing ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                              Analyzing message content...
                            </div>
                          ) : mlAnalysis ? (
                            <div className="space-y-2">
                              {/* Urgency Score */}
                              <div className="flex items-center gap-2">
                                <span className="text-sm">Urgency Level:</span>
                                <Badge 
                                  variant={
                                    mlAnalysis.urgencyScore >= 8 ? 'destructive' :
                                    mlAnalysis.urgencyScore >= 6 ? 'default' : 'secondary'
                                  }
                                  className="text-xs"
                                >
                                  {mlAnalysis.urgencyScore}/10
                                </Badge>
                                {mlAnalysis.urgencyScore >= 8 && (
                                  <span className="text-xs text-red-600">High Priority</span>
                                )}
                              </div>
                              
                              {/* Sentiment */}
                              <div className="flex items-center gap-2">
                                <span className="text-sm">Sentiment:</span>
                                <Badge variant="outline" className="text-xs">
                                  {mlAnalysis.sentiment === 'positive' ? '😊' : 
                                   mlAnalysis.sentiment === 'negative' ? '😞' : '😐'} 
                                  {mlAnalysis.sentiment}
                                </Badge>
                              </div>
                              
                              {/* Primary Intent */}
                              {mlAnalysis.intents.length > 0 && (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">Detected Intent:</span>
                                  <Badge variant="secondary" className="text-xs">
                                    {mlAnalysis.intents[0].category} ({Math.round(mlAnalysis.intents[0].confidence * 100)}%)
                                  </Badge>
                                </div>
                              )}
                              
                              {/* Suggested Response */}
                              {mlAnalysis.suggestedResponse && showMLSuggestions && (
                                <div className="mt-3 p-2 bg-background rounded border">
                                  <Label className="text-xs font-medium text-muted-foreground">Suggested Response:</Label>
                                  <p className="text-sm mt-1">{mlAnalysis.suggestedResponse}</p>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="mt-2 text-xs"
                                    onClick={() => {
                                      setNewMessage(prev => ({ 
                                        ...prev, 
                                        content: prev.content + '\n\n' + mlAnalysis.suggestedResponse 
                                      }))
                                    }}
                                  >
                                    Add to Message
                                  </Button>
                                </div>
                              )}
                              
                              {/* Required Actions */}
                              {mlAnalysis.requiredActions && mlAnalysis.requiredActions.length > 0 && showMLSuggestions && (
                                <div className="mt-3 p-2 bg-yellow-50 rounded border border-yellow-200">
                                  <Label className="text-xs font-medium text-yellow-800">Recommended Actions:</Label>
                                  <ul className="text-xs mt-1 space-y-1 text-yellow-700">
                                    {mlAnalysis.requiredActions.map((action, index) => (
                                      <li key={index} className="flex items-start gap-1">
                                        <span>•</span>
                                        <span>{action.replace(/_/g, ' ')}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              {/* Entities Detected */}
                              {mlAnalysis.entities && mlAnalysis.entities.length > 0 && showMLSuggestions && (
                                <div className="mt-3">
                                  <Label className="text-xs font-medium text-muted-foreground">Detected Information:</Label>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {mlAnalysis.entities.map((entity, index) => (
                                      <Badge key={index} variant="outline" className="text-xs">
                                        {entity.type}: {entity.value}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
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
                    className={`border rounded-lg p-4 space-y-3 ${!message.read ? 'bg-muted/50 border-primary/20' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getTypeIcon(message.type)}
                        <span className="font-medium">{message.subject}</span>
                        <Badge className={getPriorityColor(message.priority)}>
                          {message.priority}
                        </Badge>
                        <Badge variant="outline">{message.type}</Badge>
                        {message.confidential && (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <EyeSlash className="h-3 w-3" />
                            Confidential
                          </Badge>
                        )}
                        {message.requiresResponse && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Reply className="h-3 w-3" />
                            Response Required
                          </Badge>
                        )}
                        {!message.read && (
                          <Badge variant="destructive" className="text-xs">New</Badge>
                        )}
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <div>{new Date(message.timestamp).toLocaleString()}</div>
                        {message.status && (
                          <div className="flex items-center gap-1 mt-1">
                            {message.status === 'read' ? <Eye className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                            {message.status}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-sm">
                      <div className="flex justify-between mb-2 flex-wrap gap-2">
                        <span><strong>From:</strong> {message.from}</span>
                        <span><strong>To:</strong> {message.to.join(', ').replace(/-/g, ' ')}</span>
                      </div>
                      {message.responseDeadline && (
                        <div className="mb-2">
                          <span><strong>Response Deadline:</strong> {new Date(message.responseDeadline).toLocaleString()}</span>
                        </div>
                      )}
                    </div>

                    {/* Enhanced tracking information */}
                    {(message.sentTimestamp || message.deliveredTimestamp || message.readTimestamp) && (
                      <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          {message.sentTimestamp && (
                            <div>Sent: {new Date(message.sentTimestamp).toLocaleString()}</div>
                          )}
                          {message.deliveredTimestamp && (
                            <div>Delivered: {new Date(message.deliveredTimestamp).toLocaleString()}</div>
                          )}
                          {message.readTimestamp && (
                            <div>Read: {new Date(message.readTimestamp).toLocaleString()}</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Tags display */}
                    {message.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {message.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag.replace('-', ' ')}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="text-sm">
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>

                    {/* ML Analysis Results */}
                    {message.mlAnalysis && (
                      <div className="text-xs bg-blue-50 p-2 rounded border border-blue-200">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-blue-800">🤖 AI Analysis Results</span>
                          {(message.autoAdjustedPriority || message.autoSuggestedType) && (
                            <Badge variant="secondary" className="text-xs">
                              AI Enhanced
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-blue-700">
                          <div>Urgency: {message.mlAnalysis.urgencyScore}/10</div>
                          <div>Sentiment: {message.mlAnalysis.sentiment}</div>
                          {message.mlAnalysis.intents.length > 0 && (
                            <div>Intent: {message.mlAnalysis.intents[0].category}</div>
                          )}
                        </div>
                        {message.mlAnalysis.requiredActions && message.mlAnalysis.requiredActions.length > 0 && (
                          <div className="mt-1">
                            <span className="font-medium">Actions: </span>
                            {message.mlAnalysis.requiredActions.slice(0, 2).map(action => 
                              action.replace(/_/g, ' ')
                            ).join(', ')}
                            {message.mlAnalysis.requiredActions.length > 2 && '...'}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Recipients status */}
                    {message.recipients && message.recipients.length > 0 && (
                      <div className="text-xs">
                        <span className="font-medium">Recipients Status:</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {message.recipients.map((recipient, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {recipient.name}: {recipient.status}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex gap-2">
                        {!message.read && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => markAsRead(message.id)}
                          >
                            Mark as Read
                          </Button>
                        )}
                        {message.requiresResponse && !message.responseReceived && (
                          <Button 
                            size="sm" 
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
                            <Reply className="h-3 w-3" />
                            Reply
                          </Button>
                        )}
                      </div>
                      
                      {/* Device and session info */}
                      {message.deviceInfo && (
                        <div className="text-xs text-muted-foreground">
                          Sent from {message.deviceInfo.type} • {message.deviceInfo.os}
                        </div>
                      )}
                    </div>
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