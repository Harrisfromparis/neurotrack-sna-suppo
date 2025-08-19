import { User, AuthSession, Permission, GDPRConsent, DataProcessingPurpose } from './types'
import { loggingService } from './logging'

// spark is available as a global variable from @github/spark/spark
declare global {
  const spark: any
}

class AuthService {
  private currentUser: User | null = null
  private currentSession: AuthSession | null = null

  /**
   * Default permissions for different user roles
   */
  private getDefaultPermissions(role: User['role']): Permission[] {
    const basePermissions: Permission[] = [
      { resource: 'students', actions: ['read'] },
      { resource: 'behavior-logs', actions: ['read'] },
      { resource: 'activity-logs', actions: ['read'] }
    ]

    switch (role) {
      case 'administrator':
        return [
          { resource: 'students', actions: ['create', 'read', 'update', 'delete'] },
          { resource: 'behavior-logs', actions: ['create', 'read', 'update', 'delete'] },
          { resource: 'activity-logs', actions: ['create', 'read', 'update', 'delete'] },
          { resource: 'messages', actions: ['create', 'read', 'update', 'delete'] },
          { resource: 'crisis-protocols', actions: ['create', 'read', 'update', 'delete'] },
          { resource: 'analytics', actions: ['read'] },
          { resource: 'system-settings', actions: ['create', 'read', 'update', 'delete'] }
        ]
      case 'teacher':
        return [
          { resource: 'students', actions: ['create', 'read', 'update'] },
          { resource: 'behavior-logs', actions: ['create', 'read', 'update'] },
          { resource: 'activity-logs', actions: ['create', 'read', 'update'] },
          { resource: 'messages', actions: ['create', 'read', 'update'] },
          { resource: 'crisis-protocols', actions: ['read'] },
          { resource: 'analytics', actions: ['read'] }
        ]
      case 'sna':
        return [
          { resource: 'students', actions: ['read', 'update'] },
          { resource: 'behavior-logs', actions: ['create', 'read', 'update'] },
          { resource: 'activity-logs', actions: ['create', 'read', 'update'] },
          { resource: 'messages', actions: ['create', 'read'] },
          { resource: 'crisis-protocols', actions: ['read'] }
        ]
      case 'substitute':
        return basePermissions
      default:
        return basePermissions
    }
  }

  /**
   * Create default GDPR consent with required data processing purposes
   */
  private createDefaultGDPRConsent(userId: string): GDPRConsent {
    const requiredPurposes: DataProcessingPurpose[] = [
      {
        id: 'student-care',
        name: 'Student Care Management',
        description: 'Processing student data for care, safety, and educational support',
        required: true,
        consented: true
      },
      {
        id: 'legal-compliance',
        name: 'Legal Compliance',
        description: 'Processing data to comply with FERPA and other educational regulations',
        required: true,
        consented: true
      },
      {
        id: 'system-functionality',
        name: 'System Functionality',
        description: 'Essential data processing for core application features',
        required: true,
        consented: true
      }
    ]

    const optionalPurposes: DataProcessingPurpose[] = [
      {
        id: 'analytics',
        name: 'Analytics and Insights',
        description: 'Processing data to improve care outcomes and system performance',
        required: false,
        consented: false
      },
      {
        id: 'communication',
        name: 'Enhanced Communication',
        description: 'Processing data for improved team communication features',
        required: false,
        consented: false
      }
    ]

    return {
      id: crypto.randomUUID(),
      userId,
      consentGiven: true,
      consentDate: new Date().toISOString(),
      consentVersion: '1.0.0',
      dataProcessingPurposes: [...requiredPurposes, ...optionalPurposes],
      lastUpdated: new Date().toISOString()
    }
  }

  /**
   * Register a new user
   */
  async register(email: string, password: string, name: string, role: User['role'] = 'sna'): Promise<User> {
    try {
      // Check if user already exists
      const existingUsers = await spark.kv.get<User[]>('users') || []
      if (existingUsers.find(u => u.email === email)) {
        throw new Error('User with this email already exists')
      }

      // Create new user
      const userId = crypto.randomUUID()
      const newUser: User = {
        id: userId,
        email,
        name,
        role,
        permissions: this.getDefaultPermissions(role),
        createdAt: new Date().toISOString(),
        isActive: true,
        gdprConsent: this.createDefaultGDPRConsent(userId)
      }

      // Hash password (in a real app, use proper password hashing)
      const hashedPassword = btoa(password) // Basic encoding - use bcrypt in production
      
      // Store user and password
      const updatedUsers = [...existingUsers, newUser]
      await spark.kv.set('users', updatedUsers)
      await spark.kv.set(`password_${userId}`, hashedPassword)

      // Log security event
      loggingService.logSystemEvent('info', 'security', 'New user registered', {
        userId,
        email,
        role
      })

      return newUser
    } catch (error) {
      loggingService.logSystemEvent('error', 'security', 'User registration failed', {
        email,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Login user
   */
  async login(email: string, password: string): Promise<{ user: User; session: AuthSession }> {
    try {
      // Find user
      const users = await spark.kv.get<User[]>('users') || []
      const user = users.find(u => u.email === email && u.isActive)
      
      if (!user) {
        throw new Error('Invalid email or password')
      }

      // Verify password
      const storedPassword = await spark.kv.get<string>(`password_${user.id}`)
      const hashedPassword = btoa(password)
      
      if (storedPassword !== hashedPassword) {
        loggingService.logSystemEvent('warn', 'security', 'Failed login attempt', {
          email,
          userId: user.id
        })
        throw new Error('Invalid email or password')
      }

      // Create session
      const session: AuthSession = {
        id: crypto.randomUUID(),
        userId: user.id,
        token: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // 8 hours
        lastActivity: new Date().toISOString()
      }

      // Update user last login
      const updatedUser = { ...user, lastLogin: new Date().toISOString() }
      const updatedUsers = users.map(u => u.id === user.id ? updatedUser : u)
      await spark.kv.set('users', updatedUsers)
      
      // Store session
      await spark.kv.set(`session_${session.token}`, session)
      await spark.kv.set('current_session_token', session.token)

      this.currentUser = updatedUser
      this.currentSession = session

      // Initialize logging session
      await loggingService.initializeSession(user.id)

      // Log successful login
      loggingService.logSystemEvent('info', 'security', 'User logged in successfully', {
        userId: user.id,
        email: user.email,
        sessionId: session.id
      })

      return { user: updatedUser, session }
    } catch (error) {
      loggingService.logSystemEvent('error', 'security', 'Login failed', {
        email,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      if (this.currentSession) {
        // Remove session from storage
        await spark.kv.delete(`session_${this.currentSession.token}`)
        await spark.kv.delete('current_session_token')

        // Log logout
        loggingService.logSystemEvent('info', 'security', 'User logged out', {
          userId: this.currentUser?.id,
          sessionId: this.currentSession.id
        })

        // End logging session
        await loggingService.endSession()
      }

      this.currentUser = null
      this.currentSession = null
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const sessionToken = await spark.kv.get<string>('current_session_token')
      if (!sessionToken) return false

      const session = await spark.kv.get<AuthSession>(`session_${sessionToken}`)
      if (!session) return false

      // Check if session is expired
      if (new Date() > new Date(session.expiresAt)) {
        await this.logout()
        return false
      }

      // Update last activity
      const updatedSession = {
        ...session,
        lastActivity: new Date().toISOString()
      }
      await spark.kv.set(`session_${sessionToken}`, updatedSession)
      this.currentSession = updatedSession

      // Get user
      const users = await spark.kv.get<User[]>('users') || []
      const user = users.find(u => u.id === session.userId && u.isActive)
      if (!user) {
        await this.logout()
        return false
      }

      this.currentUser = user
      return true
    } catch (error) {
      console.error('Authentication check error:', error)
      return false
    }
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.currentUser
  }

  /**
   * Get current session
   */
  getCurrentSession(): AuthSession | null {
    return this.currentSession
  }

  /**
   * Check if user has permission for a specific action
   */
  hasPermission(resource: Permission['resource'], action: Permission['actions'][0]): boolean {
    if (!this.currentUser) return false

    const permission = this.currentUser.permissions.find(p => p.resource === resource)
    return permission?.actions.includes(action) || false
  }

  /**
   * Update user GDPR consent
   */
  async updateGDPRConsent(consent: Partial<GDPRConsent>): Promise<void> {
    if (!this.currentUser) throw new Error('Not authenticated')

    try {
      const users = await spark.kv.get<User[]>('users') || []
      const updatedConsent = {
        ...this.currentUser.gdprConsent,
        ...consent,
        lastUpdated: new Date().toISOString()
      }

      const updatedUser = {
        ...this.currentUser,
        gdprConsent: updatedConsent
      }

      const updatedUsers = users.map(u => u.id === this.currentUser?.id ? updatedUser : u)
      await spark.kv.set('users', updatedUsers)

      this.currentUser = updatedUser

      // Log consent update
      loggingService.logSystemEvent('info', 'security', 'GDPR consent updated', {
        userId: this.currentUser.id,
        consentVersion: updatedConsent.consentVersion
      })
    } catch (error) {
      loggingService.logSystemEvent('error', 'security', 'Failed to update GDPR consent', {
        userId: this.currentUser.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }
}

export const authService = new AuthService()