# ML-Enhanced Chatbot Integration

This update adds machine learning capabilities for intent recognition and entity extraction to the NeuroSupport communication system, along with automated CI/CD deployment.

## 🤖 Machine Learning Features

### Intent Recognition
The system now automatically analyzes messages to detect:
- **Crisis situations** - Identifies emergency/urgent situations requiring immediate attention
- **Medical concerns** - Recognizes health-related communications  
- **Behavioral updates** - Detects behavior-related messages
- **Academic progress** - Identifies learning and educational content
- **Support requests** - Recognizes when assistance is needed
- **Routine updates** - Handles schedule and activity messages

### Entity Extraction
Automatically extracts key information:
- **Emotions** - Happy, sad, angry, frustrated, calm, excited, anxious, overwhelmed
- **Urgency indicators** - Urgent, immediate, ASAP, emergency, now, quickly
- **Time references** - Morning, afternoon, lunch, recess, today, tomorrow
- **Student behaviors** - Specific behavioral patterns and triggers

### Smart Message Enhancement
- **Auto-priority adjustment** - Messages with high urgency scores automatically get elevated priority
- **Type categorization** - Content analysis suggests appropriate message types
- **Response requirements** - High-urgency messages automatically request responses
- **Suggested responses** - AI provides contextual response suggestions based on autism support knowledge

## 📊 Autism Knowledge Base

### Pre-loaded Categories
- **Crisis Management** - Emergency procedures, de-escalation techniques
- **Sensory Support** - Overload management, sensory-seeking behaviors
- **Communication** - Non-verbal support, expressive language techniques
- **Behavioral** - Repetitive behaviors, challenging behavior management
- **Social Skills** - Social interaction support, anxiety management
- **Academic** - Learning strategies, executive function support
- **Transitions** - Change management, routine support
- **Medical** - Health monitoring, coordination protocols

### Data Processing Pipeline
The system processes autism information through:
1. **Content analysis** - Extracts keywords and categorizes information
2. **Priority scoring** - Assigns importance levels based on urgency and category
3. **Response generation** - Creates contextual response templates
4. **Export formatting** - Prepares data for chatbot frameworks

## 🚀 CI/CD Integration

### GitHub Actions Workflow
Automated pipeline includes:
- **Multi-version testing** - Tests on Node.js 18.x and 20.x
- **Type checking** - TypeScript compilation validation
- **Security scanning** - CodeQL analysis and dependency audits
- **Code quality** - ESLint analysis with auto-config generation
- **Build verification** - Production build testing
- **ML data processing** - Autism knowledge base updates
- **Multi-platform deployment** - GitHub Pages, Vercel, and Netlify support

### Deployment Features
- **Artifact storage** - Build artifacts stored for 30 days
- **ML data artifacts** - Processed knowledge base stored for 90 days
- **Notification system** - Deployment status reporting
- **Branch protection** - Only deploys from main branch

## 🔧 Chatbot Framework Integration

### Supported Frameworks
Exports training data for:
- **Rasa** - YAML format with intents, entities, and responses
- **Botpress** - JSON format with utterances and answers
- **Dialogflow** - Training phrases and entity types

### Data Export Format
```json
{
  "intents": [
    {
      "name": "crisis_support", 
      "examples": ["Emergency help needed", "Student meltdown", ...]
    }
  ],
  "entities": [
    {
      "name": "autism_keywords",
      "values": ["sensory", "meltdown", "stimming", ...]
    }
  ],
  "responses": [
    {
      "intent": "crisis_support",
      "text": ["Here are crisis management strategies...", ...]
    }
  ]
}
```

## 📈 Usage Analytics

### ML Performance Tracking
- **Knowledge base size** - Total items and category distribution  
- **Analysis frequency** - Recent ML analyses count
- **Intent patterns** - Most common detected intents
- **Confidence metrics** - Average confidence scores

### Message Enhancement Stats
- **Auto-adjusted priority** - Messages with ML-modified priority
- **Auto-suggested types** - Messages with ML-categorized types
- **Response suggestions** - AI-generated response usage

## 🛠️ Development

### Key Components
- `src/lib/ml.ts` - Core ML service with intent/entity recognition
- `src/lib/dataProcessor.ts` - Autism knowledge processing utilities
- `src/scripts/initializeData.ts` - Knowledge base initialization
- `.github/workflows/ci-cd.yml` - Automated deployment pipeline

### Integration Points
- **CommunicationHub** - Real-time message analysis and suggestions
- **Message Storage** - ML analysis results stored with messages
- **Knowledge Base** - Autism support information indexing
- **Export System** - Chatbot framework data generation

## 🔄 Data Migration

The system automatically migrates existing:
- **Message history** - Extracts training patterns from past communications
- **Behavior logs** - Converts behavior data into ML training examples
- **Student data** - Maintains privacy while improving intent recognition

## 🔒 Privacy & Security

### Data Protection
- **Local processing** - ML analysis happens within Spark environment
- **No external APIs** - All processing uses local knowledge base
- **Audit logging** - All ML operations logged for compliance
- **GDPR compliance** - Follows existing privacy framework

### Security Features
- **Code scanning** - Automated security vulnerability detection
- **Dependency audits** - Regular security updates via CI/CD
- **Access controls** - Inherits existing authentication system
- **Data retention** - Follows established data management policies

This integration provides autism support professionals with AI-powered communication assistance while maintaining the privacy, security, and educational focus of the NeuroSupport platform.