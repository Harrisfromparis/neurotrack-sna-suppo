# NeuroSupport - Student Care Management System PRD

## Core Purpose & Success
- **Mission Statement**: Provide comprehensive support tools for Special Needs Assistants (SNAs) and assistant teachers to track, manage, and support neurodiverse students' daily care, learning, and behavioral needs.
- **Success Indicators**: Reduced incident response times, improved student progress tracking, enhanced communication between caregivers, and better data-driven decision making.
- **Experience Qualities**: Accessible, Professional, Supportive

## Project Classification & Approach
- **Complexity Level**: Complex Application (advanced functionality with persistent data)
- **Primary User Activity**: Creating and tracking care data, communicating with team members, analyzing student progress

## Essential Features

### Student Management
- Complete student profiles with emergency contacts, support needs, and care notes
- IEP goals tracking and progress monitoring
- Photo management for visual identification

### Daily Schedule Management
- **NEW**: Individual daily schedules for each student
- Time-based activity blocks with support level requirements
- Learning objectives and accommodations tracking
- Recurring schedule patterns for consistent routines
- Special instructions and preparation notes
- Material and equipment requirements
- Priority levels for critical activities
- Location and instructor/staff assignments

### Behavior Tracking
- Comprehensive behavior logging with triggers, interventions, and outcomes
- Severity ratings and effectiveness tracking
- Environmental factors and antecedent analysis
- Photo/video attachment support
- Progress trends and pattern identification

### Activity Logging
- Detailed activity tracking across multiple categories
- Duration tracking and engagement levels
- Support level documentation
- Success/failure outcomes with follow-up actions
- Equipment and participant tracking

### Communication Hub
- Secure messaging system between team members
- Priority levels and message threading
- Incident reports and progress updates
- Attachment support for photos and documents
- Read receipts and delivery confirmation

### Crisis Management
- Student-specific crisis protocols
- De-escalation step documentation
- Emergency procedure guidelines
- Quick access during critical situations

### Analytics & Reports
- Behavior pattern analysis
- Progress tracking visualizations
- Activity engagement metrics
- Communication summaries
- Data export capabilities

## Design Direction

### Visual Tone & Identity
- **Emotional Response**: Trust, calm, professional competence
- **Design Personality**: Clean, accessible, supportive with subtle warmth
- **Visual Metaphors**: Shield (protection), gentle curves (care), organized structure (support)
- **Simplicity Spectrum**: Clean interface that reduces cognitive load while providing comprehensive functionality

### Color Strategy
- **Color Scheme Type**: Analogous with supporting accent colors
- **Primary Color**: Soft blue (#4A90E2) - conveys trust and professionalism
- **Secondary Colors**: Gentle purple (#7B68EE) for therapy/support activities, warm gray (#6B7280) for structure
- **Accent Color**: Soft green (#10B981) for positive actions and success indicators
- **Color Psychology**: Calming blues reduce anxiety, green encourages positive associations, warm grays provide structure without harshness
- **Color Accessibility**: All color combinations meet WCAG AA standards (4.5:1 contrast ratio minimum)

### Typography System
- **Font Pairing Strategy**: Single family approach with Hubot Sans for clarity and accessibility
- **Typographic Hierarchy**: Clear size progression (32px/24px/18px/16px/14px) with consistent spacing
- **Font Personality**: Modern, legible, friendly but professional
- **Readability Focus**: Generous line height (1.5x), optimal line length (45-75 characters)
- **Typography Consistency**: Consistent heading treatment with adequate white space

### UI Elements & Component Selection
- **Component Usage**: 
  - Cards for data organization and visual grouping
  - Tabs for feature navigation without overwhelming interface
  - Dialogs for focused data entry tasks
  - Badges for status indicators and categorization
  - Select components for controlled input options
- **Component States**: Clear visual feedback for all interactive elements
- **Icon Selection**: Phosphor icons for consistent visual language
- **Spacing System**: 8px base unit with 16px/24px/32px for larger gaps
- **Mobile Adaptation**: Responsive grid system that collapses appropriately

### Schedule-Specific Design Elements
- **Timeline Visualization**: Clean time-based layout with clear activity blocks
- **Color Coding**: Activity types distinguished through subtle background colors
- **Priority Indicators**: Visual hierarchy through badges and typography
- **Support Level Visualization**: Clear indicators for required assistance levels
- **Recurring Pattern Display**: Visual cues for repeating schedule elements

## Implementation Considerations
- **Data Migration**: Automatic migration of existing students to include empty schedule structures
- **Schedule Flexibility**: Support for both rigid and flexible scheduling approaches
- **Accessibility**: Full keyboard navigation and screen reader compatibility
- **Performance**: Efficient data handling for multiple students with complex schedules
- **Scalability**: Modular component architecture for future feature additions

## Enhanced Logging Features

### Behavior Logs
- **User Actions**: Complete audit trail of who recorded each behavior entry
- **Timestamps**: Precise timestamping for behavior start, intervention, and resolution
- **Session Duration**: Track how long behavioral episodes last
- **Environmental Context**: Location, environmental factors, and antecedents
- **Intervention Effectiveness**: Quantified ratings for intervention success
- **Follow-up Tracking**: Required actions and completion status
- **Attachment Support**: Photos, videos, and documents for evidence

### Activity Logs  
- **Detailed Tracking**: Start/end times, duration, and engagement levels
- **Participant Management**: Track other students and staff involved
- **Objective Achievement**: Link activities to specific learning goals
- **Adaptation Documentation**: Record modifications made for individual needs
- **Equipment Tracking**: Required materials and assistive technology used
- **Success Metrics**: Quantified outcomes and student response levels

### Communication Messages
- **Message Threading**: Organized conversation tracking
- **Delivery Confirmation**: Sent, delivered, and read status tracking
- **Priority Management**: Urgent, high, normal, and low priority levels
- **Response Requirements**: Flag messages requiring responses with deadlines
- **Confidentiality Controls**: Secure handling of sensitive information
- **Search and Filtering**: Find specific messages and conversations quickly

### System Integration
- **User Session Tracking**: Monitor login duration and system usage patterns
- **Security Logging**: Track access attempts and data modifications
- **Performance Monitoring**: System response times and error tracking
- **Compliance Features**: Audit trails for regulatory requirements
- **Data Export**: Generate reports for IEP meetings and administrative reviews