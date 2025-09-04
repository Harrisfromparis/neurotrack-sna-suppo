import { mlService } from './ml'
import { AutismKnowledgeItem } from './types'

// spark is available as a global variable from @github/spark/spark
declare global {
  const spark: any
}

/**
 * Data processing utilities for autism information cataloging and ML training
 */
export class DataProcessor {
  
  /**
   * Process and index autism information from various sources
   */
  static async processAutismCatalog(data: {
    content: string
    category: string
    source?: string
    priority?: number
    keywords?: string[]
  }[]): Promise<void> {
    try {
      // Initialize ML service if not already done
      await mlService.initialize()
      
      // Process the data through ML service
      await mlService.processAutismInformation(data)
      
      console.log(`✅ Processed ${data.length} autism knowledge items`)
    } catch (error) {
      console.error('❌ Failed to process autism catalog:', error)
      throw error
    }
  }

  /**
   * Export processed data in format suitable for chatbot frameworks like Rasa or Botpress
   */
  static async exportForChatbotFramework(format: 'rasa' | 'botpress' | 'dialogflow' = 'rasa'): Promise<{
    data: any
    filename: string
  }> {
    try {
      await mlService.initialize()
      const exportData = await mlService.exportForChatbot()
      
      let formattedData: any
      let filename: string
      
      switch (format) {
        case 'rasa':
          formattedData = this.formatForRasa(exportData)
          filename = 'nlu_training_data.yml'
          break
          
        case 'botpress':
          formattedData = this.formatForBotpress(exportData)
          filename = 'intents.json'
          break
          
        case 'dialogflow':
          formattedData = this.formatForDialogflow(exportData)
          filename = 'dialogflow_training.json'
          break
          
        default:
          throw new Error(`Unsupported format: ${format}`)
      }
      
      return { data: formattedData, filename }
    } catch (error) {
      console.error('❌ Failed to export for chatbot framework:', error)
      throw error
    }
  }

  /**
   * Format data for Rasa NLU training
   */
  private static formatForRasa(data: {
    intents: { name: string; examples: string[] }[]
    entities: { name: string; values: string[] }[]
    responses: { intent: string; text: string[] }[]
  }) {
    const nluData = {
      version: "3.1",
      nlu: data.intents.map(intent => ({
        intent: intent.name,
        examples: intent.examples.map(example => `- ${example}`)
      })),
      entities: data.entities,
      responses: data.responses.reduce((acc, response) => {
        acc[`utter_${response.intent}`] = response.text.map(text => ({ text }))
        return acc
      }, {} as any)
    }
    
    return nluData
  }

  /**
   * Format data for Botpress
   */
  private static formatForBotpress(data: {
    intents: { name: string; examples: string[] }[]
    entities: { name: string; values: string[] }[]
    responses: { intent: string; text: string[] }[]
  }) {
    return {
      intents: data.intents.map(intent => ({
        name: intent.name,
        utterances: {
          en: intent.examples
        },
        slots: []
      })),
      entities: data.entities.map(entity => ({
        name: entity.name,
        values: entity.values.map(value => ({
          name: value,
          synonyms: [value]
        }))
      })),
      answers: data.responses.reduce((acc, response) => {
        acc[response.intent] = {
          en: response.text
        }
        return acc
      }, {} as any)
    }
  }

  /**
   * Format data for Dialogflow
   */
  private static formatForDialogflow(data: {
    intents: { name: string; examples: string[] }[]
    entities: { name: string; values: string[] }[]
    responses: { intent: string; text: string[] }[]
  }) {
    return {
      intents: data.intents.map(intent => ({
        name: intent.name,
        trainingPhrases: intent.examples.map(example => ({
          type: "EXAMPLE",
          parts: [{ text: example }]
        })),
        messages: data.responses
          .filter(r => r.intent === intent.name)
          .flatMap(r => r.text.map(text => ({
            text: { text: [text] }
          })))
      })),
      entityTypes: data.entities.map(entity => ({
        displayName: entity.name,
        kind: "KIND_MAP",
        entities: entity.values.map(value => ({
          value,
          synonyms: [value]
        }))
      }))
    }
  }

  /**
   * Migrate existing student and behavior data for ML training
   */
  static async migrateExistingData(): Promise<void> {
    try {
      // Get existing data from Spark KV
      const messages = await spark.kv.get('messages') || []
      const behaviorLogs = await spark.kv.get('behavior-logs') || []
      const students = await spark.kv.get('students') || []
      
      // Extract training data from existing messages
      const messageTrainingData = messages
        .filter((msg: any) => msg.content && msg.content.length > 10)
        .map((msg: any) => ({
          content: msg.content,
          category: this.categorizeMessage(msg.type, msg.priority),
          keywords: this.extractKeywordsFromMessage(msg.content)
        }))
      
      // Extract patterns from behavior logs
      const behaviorTrainingData = behaviorLogs
        .filter((log: any) => log.description && log.intervention)
        .map((log: any) => ({
          content: `${log.description} - Intervention: ${log.intervention}`,
          category: 'behavioral',
          keywords: [log.behavior, log.trigger, log.intervention].filter(Boolean)
        }))
      
      // Combine and process
      const allTrainingData = [...messageTrainingData, ...behaviorTrainingData]
      
      if (allTrainingData.length > 0) {
        await this.processAutismCatalog(allTrainingData)
        console.log(`✅ Migrated ${allTrainingData.length} existing records for ML training`)
      }
      
    } catch (error) {
      console.error('❌ Failed to migrate existing data:', error)
      throw error
    }
  }

  /**
   * Categorize message based on type and priority
   */
  private static categorizeMessage(type: string, priority: string): string {
    if (priority === 'urgent' || type === 'safety') return 'crisis'
    if (type === 'health') return 'medical'
    if (type === 'behavior') return 'behavioral'
    if (type === 'academic') return 'academic'
    if (type === 'incident') return 'crisis'
    return 'support'
  }

  /**
   * Extract keywords from message content
   */
  private static extractKeywordsFromMessage(content: string): string[] {
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3)

    const stopWords = ['this', 'that', 'with', 'have', 'will', 'been', 'from', 'they', 'them', 'were', 'said', 'each', 'which']
    
    return [...new Set(words.filter(word => !stopWords.includes(word)))]
  }

  /**
   * Schedule regular data processing updates
   */
  static async scheduleDataProcessing(intervalHours: number = 24): Promise<void> {
    const processData = async () => {
      try {
        await this.migrateExistingData()
        console.log('🔄 Scheduled data processing completed')
      } catch (error) {
        console.error('❌ Scheduled data processing failed:', error)
      }
    }

    // Initial processing
    await processData()
    
    // Schedule recurring processing
    setInterval(processData, intervalHours * 60 * 60 * 1000)
    
    console.log(`📅 Data processing scheduled every ${intervalHours} hours`)
  }

  /**
   * Generate analytics report on ML performance
   */
  static async generateMLAnalyticsReport(): Promise<{
    totalKnowledgeItems: number
    categoryCounts: Record<string, number>
    recentAnalyses: number
    topIntents: { intent: string; frequency: number }[]
    avgConfidence: number
  }> {
    try {
      const knowledgeBase = await spark.kv.get('autism_knowledge_base') || []
      const recentMessages = await spark.kv.get('messages') || []
      
      // Count by category
      const categoryCounts = knowledgeBase.reduce((acc: any, item: any) => {
        acc[item.category] = (acc[item.category] || 0) + 1
        return acc
      }, {})
      
      // Analyze recent ML analyses
      const last24Hours = Date.now() - (24 * 60 * 60 * 1000)
      const recentAnalyses = recentMessages.filter((msg: any) => 
        msg.mlAnalysis && new Date(msg.timestamp).getTime() > last24Hours
      ).length
      
      // Calculate intent frequencies
      const intentCounts = recentMessages
        .filter((msg: any) => msg.mlAnalysis?.intents)
        .flatMap((msg: any) => msg.mlAnalysis.intents)
        .reduce((acc: any, intent: any) => {
          acc[intent.type] = (acc[intent.type] || 0) + 1
          return acc
        }, {})
      
      const topIntents = Object.entries(intentCounts)
        .map(([intent, frequency]) => ({ intent, frequency: frequency as number }))
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 5)
      
      // Calculate average confidence
      const allIntents = recentMessages
        .filter((msg: any) => msg.mlAnalysis?.intents)
        .flatMap((msg: any) => msg.mlAnalysis.intents)
      
      const avgConfidence = allIntents.length > 0 
        ? allIntents.reduce((sum: number, intent: any) => sum + intent.confidence, 0) / allIntents.length
        : 0
      
      return {
        totalKnowledgeItems: knowledgeBase.length,
        categoryCounts,
        recentAnalyses,
        topIntents,
        avgConfidence: Math.round(avgConfidence * 100) / 100
      }
    } catch (error) {
      console.error('❌ Failed to generate ML analytics report:', error)
      throw error
    }
  }
}