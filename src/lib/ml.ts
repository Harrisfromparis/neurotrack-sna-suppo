import { loggingService } from './logging'

// spark is available as a global variable from @github/spark/spark
declare global {
  const spark: any
}

// ML Types for intent recognition and entity extraction
export interface Intent {
  type: string
  confidence: number
  category: 'support' | 'crisis' | 'routine' | 'medical' | 'behavioral' | 'academic'
}

export interface Entity {
  type: 'student_name' | 'emotion' | 'behavior' | 'location' | 'time' | 'urgency'
  value: string
  confidence: number
  start: number
  end: number
}

export interface MLAnalysis {
  intents: Intent[]
  entities: Entity[]
  sentiment: 'positive' | 'negative' | 'neutral'
  urgencyScore: number // 0-10 scale
  suggestedResponse?: string
  requiredActions?: string[]
}

export interface AutismKnowledgeItem {
  id: string
  category: string
  content: string
  keywords: string[]
  responses: string[]
  priority: number
}

/**
 * Machine Learning service for intent recognition and entity extraction
 * Integrates with Spark's MLlib capabilities for preprocessing and analysis
 */
class MLService {
  private initialized = false
  private knowledgeBase: AutismKnowledgeItem[] = []

  /**
   * Initialize ML service and load autism knowledge base
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      // Load autism knowledge base from Spark KV
      this.knowledgeBase = await spark.kv.get<AutismKnowledgeItem[]>('autism_knowledge_base') || []
      
      // Initialize with default knowledge if empty
      if (this.knowledgeBase.length === 0) {
        await this.initializeDefaultKnowledge()
      }

      this.initialized = true
      
      loggingService.logSystemEvent('info', 'ml', 'ML service initialized', {
        knowledgeBaseSize: this.knowledgeBase.length
      })
    } catch (error) {
      loggingService.logSystemEvent('error', 'ml', 'Failed to initialize ML service', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Analyze message content for intents and entities
   */
  async analyzeMessage(content: string, context?: {
    studentId?: string
    senderRole?: string
    previousMessages?: string[]
  }): Promise<MLAnalysis> {
    await this.ensureInitialized()

    try {
      const analysis = await this.performAnalysis(content, context)
      
      // Log analysis for improvement
      loggingService.logSystemEvent('info', 'ml', 'Message analyzed', {
        studentId: context?.studentId,
        intentCount: analysis.intents.length,
        entityCount: analysis.entities.length,
        urgencyScore: analysis.urgencyScore
      })

      return analysis
    } catch (error) {
      loggingService.logSystemEvent('error', 'ml', 'Message analysis failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      
      // Return basic analysis on error
      return {
        intents: [],
        entities: [],
        sentiment: 'neutral',
        urgencyScore: 5
      }
    }
  }

  /**
   * Process and index autism information for fast retrieval
   */
  async processAutismInformation(data: {
    content: string
    category: string
    keywords?: string[]
  }[]): Promise<void> {
    await this.ensureInitialized()

    try {
      const processedItems: AutismKnowledgeItem[] = data.map((item, index) => ({
        id: crypto.randomUUID(),
        category: item.category,
        content: item.content,
        keywords: item.keywords || this.extractKeywords(item.content),
        responses: this.generateResponses(item.content, item.category),
        priority: this.calculatePriority(item.category, item.content)
      }))

      // Add to knowledge base
      this.knowledgeBase.push(...processedItems)
      
      // Save to Spark KV
      await spark.kv.set('autism_knowledge_base', this.knowledgeBase)

      loggingService.logSystemEvent('info', 'ml', 'Autism information processed', {
        itemsProcessed: processedItems.length,
        totalKnowledgeBaseSize: this.knowledgeBase.length
      })
    } catch (error) {
      loggingService.logSystemEvent('error', 'ml', 'Failed to process autism information', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Export processed data for chatbot framework consumption
   */
  async exportForChatbot(): Promise<{
    intents: { name: string; examples: string[] }[]
    entities: { name: string; values: string[] }[]
    responses: { intent: string; text: string[] }[]
  }> {
    await this.ensureInitialized()

    const intents = this.extractIntentTemplates()
    const entities = this.extractEntityTemplates()
    const responses = this.extractResponseTemplates()

    return { intents, entities, responses }
  }

  /**
   * Get suggested response based on intent and context
   */
  async getSuggestedResponse(intent: Intent, entities: Entity[], context?: {
    studentId?: string
    urgencyScore?: number
  }): Promise<string | null> {
    await this.ensureInitialized()

    const relevantKnowledge = this.knowledgeBase.filter(item => 
      item.category === intent.category || 
      item.keywords.some(keyword => 
        entities.some(entity => entity.value.toLowerCase().includes(keyword.toLowerCase()))
      )
    )

    if (relevantKnowledge.length === 0) return null

    // Select best response based on priority and context
    const bestMatch = relevantKnowledge.sort((a, b) => b.priority - a.priority)[0]
    return bestMatch.responses[0] || null
  }

  /**
   * Perform ML analysis using rule-based approach with pattern matching
   */
  private async performAnalysis(content: string, context?: {
    studentId?: string
    senderRole?: string
    previousMessages?: string[]
  }): Promise<MLAnalysis> {
    const text = content.toLowerCase()
    
    // Intent recognition
    const intents = this.recognizeIntents(text)
    
    // Entity extraction  
    const entities = this.extractEntities(content)
    
    // Sentiment analysis
    const sentiment = this.analyzeSentiment(text)
    
    // Urgency scoring
    const urgencyScore = this.calculateUrgencyScore(text, intents, entities)
    
    // Generate suggested response
    const suggestedResponse = intents.length > 0 ? 
      await this.getSuggestedResponse(intents[0], entities, context) : 
      undefined
    
    // Determine required actions
    const requiredActions = this.determineRequiredActions(intents, entities, urgencyScore)

    return {
      intents,
      entities,
      sentiment,
      urgencyScore,
      suggestedResponse: suggestedResponse || undefined,
      requiredActions
    }
  }

  /**
   * Recognize intents from text using pattern matching
   */
  private recognizeIntents(text: string): Intent[] {
    const intents: Intent[] = []

    // Crisis/Emergency patterns
    if (/\b(emergency|crisis|help|urgent|meltdown|aggressive|hurt|danger)\b/.test(text)) {
      intents.push({ type: 'crisis_alert', confidence: 0.9, category: 'crisis' })
    }

    // Behavioral patterns
    if (/\b(behavior|acting out|stimming|tantrum|disruptive|calm|focus)\b/.test(text)) {
      intents.push({ type: 'behavior_report', confidence: 0.8, category: 'behavioral' })
    }

    // Medical patterns  
    if (/\b(medication|sick|tired|pain|headache|stomach|allergy)\b/.test(text)) {
      intents.push({ type: 'medical_concern', confidence: 0.85, category: 'medical' })
    }

    // Academic patterns
    if (/\b(learning|homework|assignment|reading|math|progress|goal)\b/.test(text)) {
      intents.push({ type: 'academic_update', confidence: 0.7, category: 'academic' })
    }

    // Support request patterns
    if (/\b(need help|support|assistance|guidance|advice|what should)\b/.test(text)) {
      intents.push({ type: 'support_request', confidence: 0.75, category: 'support' })
    }

    // Routine patterns
    if (/\b(schedule|routine|break|lunch|transition|activity)\b/.test(text)) {
      intents.push({ type: 'routine_update', confidence: 0.6, category: 'routine' })
    }

    return intents
  }

  /**
   * Extract entities from text
   */
  private extractEntities(text: string): Entity[] {
    const entities: Entity[] = []

    // Extract emotions
    const emotionRegex = /\b(happy|sad|angry|frustrated|calm|excited|anxious|overwhelmed)\b/gi
    let match
    while ((match = emotionRegex.exec(text)) !== null) {
      entities.push({
        type: 'emotion',
        value: match[0],
        confidence: 0.8,
        start: match.index,
        end: match.index + match[0].length
      })
    }

    // Extract urgency indicators
    const urgencyRegex = /\b(urgent|immediate|asap|emergency|now|quickly)\b/gi
    while ((match = urgencyRegex.exec(text)) !== null) {
      entities.push({
        type: 'urgency',
        value: match[0],
        confidence: 0.9,
        start: match.index,
        end: match.index + match[0].length
      })
    }

    // Extract time references
    const timeRegex = /\b(morning|afternoon|lunch|recess|today|tomorrow|now)\b/gi
    while ((match = timeRegex.exec(text)) !== null) {
      entities.push({
        type: 'time',
        value: match[0],
        confidence: 0.7,
        start: match.index,
        end: match.index + match[0].length
      })
    }

    return entities
  }

  /**
   * Analyze sentiment of text
   */
  private analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = ['good', 'great', 'happy', 'calm', 'success', 'progress', 'better', 'improvement']
    const negativeWords = ['bad', 'terrible', 'angry', 'upset', 'problem', 'issue', 'difficult', 'struggle']

    const positiveCount = positiveWords.filter(word => text.includes(word)).length
    const negativeCount = negativeWords.filter(word => text.includes(word)).length

    if (positiveCount > negativeCount) return 'positive'
    if (negativeCount > positiveCount) return 'negative'
    return 'neutral'
  }

  /**
   * Calculate urgency score (0-10)
   */
  private calculateUrgencyScore(text: string, intents: Intent[], entities: Entity[]): number {
    let score = 5 // Default neutral score

    // Crisis intents increase urgency
    if (intents.some(i => i.category === 'crisis')) score += 4
    if (intents.some(i => i.category === 'medical')) score += 2
    if (intents.some(i => i.category === 'behavioral')) score += 1

    // Urgency entities increase score
    const urgencyEntities = entities.filter(e => e.type === 'urgency')
    score += urgencyEntities.length * 2

    // Emotion entities can affect urgency
    const negativeEmotions = entities.filter(e => 
      e.type === 'emotion' && ['angry', 'frustrated', 'anxious', 'overwhelmed'].includes(e.value.toLowerCase())
    )
    score += negativeEmotions.length

    return Math.min(10, Math.max(0, score))
  }

  /**
   * Determine required actions based on analysis
   */
  private determineRequiredActions(intents: Intent[], entities: Entity[], urgencyScore: number): string[] {
    const actions: string[] = []

    if (urgencyScore >= 8) {
      actions.push('immediate_response_required')
    }

    if (intents.some(i => i.category === 'crisis')) {
      actions.push('notify_crisis_team', 'document_incident')
    }

    if (intents.some(i => i.category === 'medical')) {
      actions.push('notify_school_nurse', 'contact_parent')
    }

    if (intents.some(i => i.category === 'behavioral')) {
      actions.push('log_behavior_incident', 'review_intervention_plan')
    }

    if (urgencyScore >= 6) {
      actions.push('escalate_to_supervisor')
    }

    return actions
  }

  /**
   * Initialize default autism knowledge base
   */
  private async initializeDefaultKnowledge(): Promise<void> {
    const defaultKnowledge: AutismKnowledgeItem[] = [
      {
        id: crypto.randomUUID(),
        category: 'crisis',
        content: 'Meltdown management: Ensure safety, reduce stimuli, remain calm, use calming strategies',
        keywords: ['meltdown', 'overwhelmed', 'crisis', 'escalation'],
        responses: [
          'I understand this is a challenging situation. Let me help you with some immediate strategies.',
          'Safety first - please ensure the student is in a safe environment and reduce any overwhelming stimuli.'
        ],
        priority: 10
      },
      {
        id: crypto.randomUUID(),
        category: 'behavioral',
        content: 'Sensory seeking behaviors: Provide alternative sensory input, use fidget tools, create sensory breaks',
        keywords: ['stimming', 'sensory', 'fidgeting', 'self-regulation'],
        responses: [
          'Sensory behaviors often serve an important purpose. Consider providing alternative sensory tools.',
          'Regular sensory breaks can help prevent overwhelming behaviors.'
        ],
        priority: 8
      },
      {
        id: crypto.randomUUID(),
        category: 'academic',
        content: 'Learning support: Break tasks into smaller steps, use visual supports, provide processing time',
        keywords: ['learning', 'academic', 'tasks', 'processing', 'comprehension'],
        responses: [
          'Breaking complex tasks into smaller, manageable steps often helps with learning.',
          'Visual supports and extra processing time can make a significant difference.'
        ],
        priority: 6
      }
    ]

    this.knowledgeBase = defaultKnowledge
    await spark.kv.set('autism_knowledge_base', this.knowledgeBase)
  }

  /**
   * Extract keywords from content using simple word frequency
   */
  private extractKeywords(content: string): string[] {
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3)

    // Remove common stop words
    const stopWords = ['this', 'that', 'with', 'have', 'will', 'been', 'from', 'they', 'them', 'were', 'said', 'each', 'which', 'their', 'time', 'about']
    
    return [...new Set(words.filter(word => !stopWords.includes(word)))]
  }

  /**
   * Generate response templates based on content and category
   */
  private generateResponses(content: string, category: string): string[] {
    const templates = {
      crisis: [
        'This appears to be an urgent situation requiring immediate attention.',
        'Please ensure safety protocols are followed and document the incident.'
      ],
      medical: [
        'Medical concerns should be addressed promptly with appropriate staff.',
        'Please contact the school nurse and notify parents if necessary.'
      ],
      behavioral: [
        'Behavioral observations are important for developing effective strategies.',
        'Consider documenting triggers and successful interventions.'
      ],
      academic: [
        'Academic progress tracking helps identify effective teaching strategies.',
        'Regular assessment helps ensure student needs are being met.'
      ],
      support: [
        'Support requests help ensure students receive appropriate assistance.',
        'Collaboration between team members improves student outcomes.'
      ],
      routine: [
        'Routine updates help maintain consistency for students who need structure.',
        'Clear schedules and transitions support student success.'
      ]
    }

    return templates[category as keyof typeof templates] || [
      'Thank you for this information. It will help improve student support.',
      'This feedback is valuable for ongoing care planning.'
    ]
  }

  /**
   * Calculate priority based on category and content
   */
  private calculatePriority(category: string, content: string): number {
    const categoryPriorities = {
      crisis: 10,
      medical: 9,
      behavioral: 7,
      academic: 5,
      support: 6,
      routine: 4
    }

    let priority = categoryPriorities[category as keyof typeof categoryPriorities] || 5

    // Adjust based on content urgency indicators
    if (/\b(urgent|emergency|immediate|asap)\b/i.test(content)) {
      priority = Math.min(10, priority + 2)
    }

    return priority
  }

  /**
   * Extract intent templates for chatbot framework
   */
  private extractIntentTemplates() {
    const intentMap = new Map<string, string[]>()
    
    this.knowledgeBase.forEach(item => {
      const intentName = `${item.category}_intent`
      if (!intentMap.has(intentName)) {
        intentMap.set(intentName, [])
      }
      intentMap.get(intentName)?.push(item.content)
    })

    return Array.from(intentMap.entries()).map(([name, examples]) => ({
      name,
      examples
    }))
  }

  /**
   * Extract entity templates for chatbot framework
   */
  private extractEntityTemplates() {
    const entities = new Map<string, Set<string>>()
    
    this.knowledgeBase.forEach(item => {
      item.keywords.forEach(keyword => {
        if (!entities.has('keywords')) {
          entities.set('keywords', new Set())
        }
        entities.get('keywords')?.add(keyword)
      })
    })

    return Array.from(entities.entries()).map(([name, values]) => ({
      name,
      values: Array.from(values)
    }))
  }

  /**
   * Extract response templates for chatbot framework
   */
  private extractResponseTemplates() {
    return this.knowledgeBase.map(item => ({
      intent: `${item.category}_intent`,
      text: item.responses
    }))
  }

  /**
   * Ensure ML service is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize()
    }
  }
}

export const mlService = new MLService()