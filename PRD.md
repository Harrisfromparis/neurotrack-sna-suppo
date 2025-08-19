# NeuroSupport - Student Care Management for SNAs

A comprehensive digital companion for Special Needs Assistants (SNAs) and assistant teachers to track, support, and manage the daily needs of neurodiverse students in their care.

**Experience Qualities**: 
1. **Intuitive** - Simple, clear interface that works seamlessly during busy classroom moments
2. **Reliable** - Consistent data tracking that builds trust between SNAs, teachers, and families
3. **Compassionate** - Thoughtful design that honors the dignity and individual needs of each student

**Complexity Level**: 
- Complex Application (advanced functionality, accounts)
- Requires comprehensive state management for multiple students, detailed behavior tracking, communication logs, and data persistence across sessions

## Essential Features

### Student Profile Management
- **Functionality**: Create and manage detailed profiles for neurodiverse students including personal info, support needs, emergency contacts, and care plans
- **Purpose**: Centralized student information for consistent care and quick reference
- **Trigger**: SNA selects "Add Student" or clicks existing student card
- **Progression**: Add Student → Enter Basic Info → Add Support Needs → Set Communication Preferences → Save Profile
- **Success criteria**: Profile saves successfully and displays in student dashboard

### Behavior Tracking & Analytics
- **Functionality**: Log behavioral incidents, triggers, interventions used, and outcomes with timestamp data
- **Purpose**: Identify patterns and effective strategies for individual students
- **Trigger**: Quick-log button during incidents or scheduled review entry
- **Progression**: Select Student → Log Behavior → Choose Type/Severity → Record Intervention → Add Notes → Save
- **Success criteria**: Behavioral data creates visual trends and pattern recognition

### Communication Hub
- **Functionality**: Send messages to teachers, parents, and support staff with priority levels and read receipts
- **Purpose**: Maintain clear communication channels about student progress and needs
- **Trigger**: Message icon from student profile or general inbox
- **Progression**: Select Recipient → Choose Message Type → Write Message → Set Priority → Send
- **Success criteria**: Messages deliver with confirmation and create threaded conversations

### Daily Activity Logging
- **Functionality**: Track meals, medications, bathroom breaks, therapy sessions, and academic participation
- **Purpose**: Comprehensive daily care documentation for health and educational planning
- **Trigger**: Real-time logging throughout the day or end-of-day summary entry
- **Progression**: Select Student → Choose Activity Type → Log Details → Add Time/Notes → Save Entry
- **Success criteria**: Daily logs generate complete timeline and can export for reports

### Crisis Management Tools
- **Functionality**: Quick access to emergency contacts, de-escalation strategies, and crisis protocols specific to each student
- **Purpose**: Immediate support during behavioral or medical emergencies
- **Trigger**: Emergency button or student distress indicators
- **Progression**: Activate Crisis Mode → Select Student → Access Protocols → Log Crisis Response → Contact Emergency Contacts
- **Success criteria**: Crisis information accessible within 3 seconds, creates incident report

### Progress Monitoring
- **Functionality**: Set and track IEP goals, academic milestones, and behavioral objectives with visual progress indicators
- **Purpose**: Data-driven support for educational and therapeutic goals
- **Trigger**: Weekly progress review or milestone achievement
- **Progression**: Select Goal → Update Progress → Add Evidence/Notes → Calculate Percentage → Update Timeline
- **Success criteria**: Progress visualizations help identify successful interventions and areas needing support

## Edge Case Handling

- **Offline Functionality**: Local storage ensures data entry continues when internet is unavailable
- **Data Privacy**: Secure student information with role-based access and FERPA compliance
- **Multiple Student Crisis**: Priority queue system for simultaneous emergency situations
- **Substitute Staff**: Quick-access student summary cards for unfamiliar SNAs
- **Parent Portal Access**: Optional read-only access for families to view daily reports
- **Integration Failure**: Backup communication methods when primary systems are down

## Design Direction

The design should feel professional yet warm, creating a sense of competence and care that reflects the important work of supporting neurodiverse students - clean, accessible interface with intuitive navigation that works well under pressure.

## Color Selection

Complementary (opposite colors) - Using calming blues and warm oranges to create both trust and energy, supporting the dual nature of professional care and student engagement.

- **Primary Color**: Deep Ocean Blue (oklch(0.35 0.15 250)) - Communicates trust, stability, and professional competence
- **Secondary Colors**: Soft Sage Green (oklch(0.75 0.08 140)) for success states and calming elements, Light Lavender (oklch(0.85 0.12 280)) for information displays
- **Accent Color**: Warm Coral (oklch(0.65 0.18 25)) - Attention-grabbing highlight for urgent items and important CTAs
- **Foreground/Background Pairings**: 
  - Background (White oklch(1 0 0)): Primary text (oklch(0.2 0 0)) - Ratio 10.4:1 ✓
  - Card (Light Gray oklch(0.98 0 0)): Primary text (oklch(0.2 0 0)) - Ratio 9.8:1 ✓  
  - Primary (Deep Ocean oklch(0.35 0.15 250)): White text (oklch(1 0 0)) - Ratio 8.2:1 ✓
  - Accent (Warm Coral oklch(0.65 0.18 25)): White text (oklch(1 0 0)) - Ratio 4.6:1 ✓
  - Secondary (Sage Green oklch(0.75 0.08 140)): Dark text (oklch(0.25 0 0)) - Ratio 5.1:1 ✓

## Font Selection

Typography should convey clarity and accessibility while feeling approachable - using Inter for its excellent readability and professional appearance across all devices and reading abilities.

- **Typographic Hierarchy**: 
  - H1 (App Title): Inter Bold/32px/tight letter spacing
  - H2 (Section Headers): Inter Semibold/24px/normal spacing
  - H3 (Card Titles): Inter Medium/18px/normal spacing
  - Body Text: Inter Regular/16px/relaxed line height
  - Small Text: Inter Regular/14px/normal spacing
  - Labels: Inter Medium/14px/wide letter spacing

## Animations

Subtle and purposeful animations that reduce cognitive load while providing clear feedback - minimal motion that supports workflow rather than distracting from urgent student needs.

- **Purposeful Meaning**: Gentle transitions communicate system reliability and provide calm, non-intrusive feedback during stressful situations
- **Hierarchy of Movement**: Priority alerts get immediate attention, routine updates use subtle transitions, navigation changes use smooth spatial continuity

## Component Selection

- **Components**: Cards for student profiles, Dialogs for detailed entry forms, Tabs for organizing student information, Badges for status indicators, Progress bars for goal tracking, Alert dialogs for crisis situations
- **Customizations**: Emergency action buttons with high-contrast styling, Quick-log floating action buttons, Student photo placeholders with accessibility considerations
- **States**: Clear hover/active states for all interactive elements, loading states for data sync, error states with recovery guidance, success confirmations for important actions
- **Icon Selection**: Phosphor icons for consistency - User for profiles, Clock for logging, MessageCircle for communication, Heart for health tracking, Shield for crisis management
- **Spacing**: Generous padding using Tailwind's spacing scale (p-4, p-6) to ensure accessibility and reduce visual stress
- **Mobile**: Mobile-first design with large touch targets (min 44px), collapsible navigation, swipe gestures for quick actions, simplified forms for one-handed operation