import { DataProcessor } from '../lib/dataProcessor'

/**
 * Initialize autism knowledge base with essential data
 * This script can be run during deployment or setup
 */
async function initializeKnowledgeBase() {
  console.log('🚀 Initializing Autism Support Knowledge Base...')
  
  try {
    const knowledgeData = [
      {
        category: 'crisis',
        content: 'When a student is having a meltdown, prioritize safety, reduce environmental stimuli, use calming voice, avoid physical restraint unless absolutely necessary for safety',
        keywords: ['meltdown', 'crisis', 'emergency', 'overwhelmed', 'aggressive', 'self-harm'],
        priority: 10
      },
      {
        category: 'crisis', 
        content: 'De-escalation techniques: speak slowly and calmly, offer choices when possible, use visual supports, create physical space, remove triggers',
        keywords: ['de-escalation', 'calm', 'safety', 'triggers', 'space'],
        priority: 9
      },
      {
        category: 'sensory',
        content: 'Sensory overload management: dim lights, reduce noise, provide quiet space, offer noise-canceling headphones, use weighted blankets or fidget tools',
        keywords: ['sensory', 'overload', 'stimming', 'noise', 'lights', 'fidget', 'weighted'],
        priority: 8
      },
      {
        category: 'sensory',
        content: 'Sensory seeking behaviors: provide appropriate sensory input through movement breaks, textured materials, chewable items, compression activities',
        keywords: ['sensory-seeking', 'movement', 'texture', 'chewing', 'compression', 'input'],
        priority: 7
      },
      {
        category: 'communication',
        content: 'Support non-verbal communication through visual schedules, picture cards (PECS), sign language, communication devices (AAC), gestures',
        keywords: ['non-verbal', 'visual', 'PECS', 'sign-language', 'AAC', 'pictures'],
        priority: 8
      },
      {
        category: 'communication',
        content: 'Improve expressive language: use simple clear language, give processing time, model appropriate responses, use social stories',
        keywords: ['expressive', 'language', 'processing', 'social-stories', 'modeling'],
        priority: 6
      },
      {
        category: 'behavioral',
        content: 'Address repetitive behaviors: understand the function (self-regulation, communication, sensory needs), provide alternatives, maintain routines',
        keywords: ['repetitive', 'stimming', 'self-regulation', 'routine', 'function', 'alternatives'],
        priority: 7
      },
      {
        category: 'behavioral',
        content: 'Manage challenging behaviors: identify triggers, use positive reinforcement, implement consistent boundaries, track patterns',
        keywords: ['challenging', 'triggers', 'reinforcement', 'boundaries', 'patterns', 'consequences'],
        priority: 8
      },
      {
        category: 'social',
        content: 'Develop social skills: practice turn-taking, teach social cues recognition, use role-playing, facilitate structured peer interactions',
        keywords: ['social-skills', 'turn-taking', 'cues', 'role-playing', 'peers', 'interaction'],
        priority: 6
      },
      {
        category: 'social',
        content: 'Support social anxiety: prepare for changes, use gradual exposure, provide safe retreat spaces, teach coping strategies',
        keywords: ['social-anxiety', 'changes', 'exposure', 'retreat', 'coping', 'strategies'],
        priority: 7
      },
      {
        category: 'academic',
        content: 'Learning support strategies: break tasks into smaller steps, use visual instructions, provide extra processing time, offer multiple ways to demonstrate knowledge',
        keywords: ['learning', 'tasks', 'visual-instructions', 'processing-time', 'demonstration'],
        priority: 6
      },
      {
        category: 'academic',
        content: 'Executive function support: use checklists, timers, organization systems, teach planning strategies, provide structure and routine',
        keywords: ['executive-function', 'checklists', 'timers', 'organization', 'planning', 'structure'],
        priority: 6
      },
      {
        category: 'transition',
        content: 'Transition support: give advance warning, use visual schedules, practice new routines, provide transition objects or activities',
        keywords: ['transition', 'warning', 'schedules', 'routines', 'objects', 'change'],
        priority: 7
      },
      {
        category: 'medical',
        content: 'Monitor for medical needs: seizures, medication effects, sleep issues, digestive problems, allergies, dietary restrictions',
        keywords: ['medical', 'seizures', 'medication', 'sleep', 'digestive', 'allergies', 'diet'],
        priority: 9
      },
      {
        category: 'medical',
        content: 'Coordinate with healthcare providers: share observations, follow medical protocols, document symptoms, communicate with parents',
        keywords: ['healthcare', 'protocols', 'symptoms', 'documentation', 'coordination'],
        priority: 8
      }
    ]

    await DataProcessor.processAutismCatalog(knowledgeData)
    
    console.log(`✅ Successfully initialized knowledge base with ${knowledgeData.length} items`)
    
    // Generate and log analytics
    const analytics = await DataProcessor.generateMLAnalyticsReport()
    console.log('📊 Knowledge Base Analytics:')
    console.log(`   Total items: ${analytics.totalKnowledgeItems}`)
    console.log(`   Categories: ${Object.keys(analytics.categoryCounts).join(', ')}`)
    
    // Export sample data for chatbot frameworks
    const rasaExport = await DataProcessor.exportForChatbotFramework('rasa')
    const botpressExport = await DataProcessor.exportForChatbotFramework('botpress')
    
    console.log('🤖 Chatbot Framework Data:')
    console.log(`   Rasa training file: ${rasaExport.filename}`)
    console.log(`   Botpress intents file: ${botpressExport.filename}`)
    
    // Test ML analysis
    console.log('\n🧪 Testing ML Analysis...')
    const testMessages = [
      'The student is having a meltdown and needs immediate help',
      'Everything went well today, great progress with communication',
      'Student seems overwhelmed by noise in the classroom',
      'Need advice on managing repetitive behaviors during lessons'
    ]
    
    const { mlService } = await import('../lib/ml')
    await mlService.initialize()
    
    for (const testMessage of testMessages) {
      const analysis = await mlService.analyzeMessage(testMessage)
      console.log(`   Message: "${testMessage}"`)
      console.log(`   → Intent: ${analysis.intents[0]?.category || 'none'}, Urgency: ${analysis.urgencyScore}/10`)
    }
    
    console.log('\n🎉 Knowledge base initialization completed successfully!')
    
  } catch (error) {
    console.error('❌ Failed to initialize knowledge base:', error)
    throw error
  }
}

// Export for use in CI/CD or manual initialization
if (typeof window === 'undefined') {
  // Running in Node.js (server/build environment)
  initializeKnowledgeBase().catch(console.error)
}

export { initializeKnowledgeBase }