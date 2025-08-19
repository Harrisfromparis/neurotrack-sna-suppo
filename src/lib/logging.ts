import { UserSession, UserActivity, SystemLog, DeviceInfo } from './types'

class LoggingService {
  private currentSession: UserSession | null = null
  private sessionStartTime: number = 0
  private logs: SystemLog[] = []

  /**
   * Initialize logging service and start user session
   */
  async initializeSession(userId: string): Promise<string> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    this.sessionStartTime = Date.now()
    
    const deviceInfo = this.getDeviceInfo()
    
    this.currentSession = {
      id: sessionId,
      userId,
      startTime: new Date().toISOString(),
      deviceInfo,
      location: await this.getUserLocation(),
      activities: [],
      status: 'active'
    }

    // Save session to storage
    await this.saveSession()
    
    // Log session start
    this.logSystemEvent('info', 'user-action', 'Session started', {
      userId,
      sessionId,
      deviceInfo
    })

    return sessionId
  }

  /**
   * End current session
   */
  async endSession(): Promise<void> {
    if (!this.currentSession) return

    const endTime = new Date().toISOString()
    const duration = Math.round((Date.now() - this.sessionStartTime) / 1000 / 60) // minutes

    this.currentSession.endTime = endTime
    this.currentSession.duration = duration
    this.currentSession.status = 'ended'

    await this.saveSession()
    
    this.logSystemEvent('info', 'user-action', 'Session ended', {
      sessionId: this.currentSession.id,
      duration: `${duration} minutes`
    })

    this.currentSession = null
  }

  /**
   * Log user activity
   */
  logActivity(action: string, target?: string, details?: Record<string, any>): void {
    if (!this.currentSession) return

    const activity: UserActivity = {
      id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      sessionId: this.currentSession.id,
      timestamp: new Date().toISOString(),
      action,
      target,
      details,
      success: true
    }

    this.currentSession.activities.push(activity)
    this.saveSession()

    // Also log as system event
    this.logSystemEvent('info', 'user-action', `User ${action}${target ? ` on ${target}` : ''}`, {
      userId: this.currentSession.userId,
      sessionId: this.currentSession.id,
      ...details
    })
  }

  /**
   * Log error activity
   */
  logError(action: string, error: string, target?: string, details?: Record<string, any>): void {
    if (!this.currentSession) return

    const activity: UserActivity = {
      id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      sessionId: this.currentSession.id,
      timestamp: new Date().toISOString(),
      action,
      target,
      details,
      success: false,
      errorMessage: error
    }

    this.currentSession.activities.push(activity)
    this.saveSession()

    this.logSystemEvent('error', 'user-action', `Error during ${action}: ${error}`, {
      userId: this.currentSession.userId,
      sessionId: this.currentSession.id,
      target,
      error,
      ...details
    })
  }

  /**
   * Log system events
   */
  logSystemEvent(
    level: 'info' | 'warn' | 'error' | 'debug',
    category: 'user-action' | 'system-event' | 'security' | 'performance',
    message: string,
    details?: Record<string, any>
  ): void {
    const log: SystemLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      userId: this.currentSession?.userId,
      sessionId: this.currentSession?.id,
      details,
      source: 'NeuroSupport-App'
    }

    this.logs.push(log)
    
    // Keep only last 1000 logs in memory
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000)
    }

    // Save to persistent storage periodically
    this.saveLogs()
  }

  /**
   * Get current session ID
   */
  getCurrentSessionId(): string | null {
    return this.currentSession?.id || null
  }

  /**
   * Get current user ID
   */
  getCurrentUserId(): string | null {
    return this.currentSession?.userId || null
  }

  /**
   * Get device information
   */
  private getDeviceInfo(): DeviceInfo {
    const userAgent = navigator.userAgent
    let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop'
    
    if (/Mobile|Android|iPhone|iPad|iPod|BlackBerry|Opera Mini|IEMobile|WPDesktop/i.test(userAgent)) {
      deviceType = /iPad|Android(?!.*Mobile)/i.test(userAgent) ? 'tablet' : 'mobile'
    }

    let os = 'Unknown'
    if (/Windows/i.test(userAgent)) os = 'Windows'
    else if (/Mac/i.test(userAgent)) os = 'macOS'
    else if (/Linux/i.test(userAgent)) os = 'Linux'
    else if (/Android/i.test(userAgent)) os = 'Android'
    else if (/iOS|iPhone|iPad|iPod/i.test(userAgent)) os = 'iOS'

    return {
      type: deviceType,
      os,
      browser: this.getBrowser(),
      userAgent
    }
  }

  /**
   * Get browser information
   */
  private getBrowser(): string {
    const userAgent = navigator.userAgent
    if (/Chrome/i.test(userAgent)) return 'Chrome'
    if (/Firefox/i.test(userAgent)) return 'Firefox'
    if (/Safari/i.test(userAgent)) return 'Safari'
    if (/Edge/i.test(userAgent)) return 'Edge'
    if (/Opera/i.test(userAgent)) return 'Opera'
    return 'Unknown'
  }

  /**
   * Get user location (if permitted)
   */
  private async getUserLocation(): Promise<string | undefined> {
    try {
      if (!navigator.geolocation) return undefined
      
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve(`${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`)
          },
          () => resolve(undefined),
          { timeout: 5000, enableHighAccuracy: false }
        )
      })
    } catch {
      return undefined
    }
  }

  /**
   * Save session to storage
   */
  private async saveSession(): Promise<void> {
    if (!this.currentSession) return
    
    try {
      await spark.kv.set(`session_${this.currentSession.id}`, this.currentSession)
      await spark.kv.set('current_session', this.currentSession.id)
    } catch (error) {
      console.error('Failed to save session:', error)
    }
  }

  /**
   * Save logs to storage
   */
  private async saveLogs(): Promise<void> {
    try {
      const existingLogs = await spark.kv.get<SystemLog[]>('system_logs') || []
      const allLogs = [...existingLogs, ...this.logs.slice(-100)] // Save last 100 new logs
      
      // Keep only last 5000 logs in storage
      const logsToSave = allLogs.slice(-5000)
      
      await spark.kv.set('system_logs', logsToSave)
      this.logs = [] // Clear in-memory logs after saving
    } catch (error) {
      console.error('Failed to save logs:', error)
    }
  }

  /**
   * Get session analytics
   */
  async getSessionAnalytics(sessionId?: string): Promise<any> {
    const targetSessionId = sessionId || this.currentSession?.id
    if (!targetSessionId) return null

    try {
      const session = await spark.kv.get<UserSession>(`session_${targetSessionId}`)
      if (!session) return null

      const totalActivities = session.activities.length
      const successfulActivities = session.activities.filter(a => a.success).length
      const failedActivities = totalActivities - successfulActivities
      
      const activityTypes = session.activities.reduce((acc, activity) => {
        acc[activity.action] = (acc[activity.action] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      return {
        session,
        analytics: {
          totalActivities,
          successfulActivities,
          failedActivities,
          successRate: totalActivities > 0 ? (successfulActivities / totalActivities) * 100 : 0,
          activityTypes,
          duration: session.duration || 0
        }
      }
    } catch (error) {
      console.error('Failed to get session analytics:', error)
      return null
    }
  }

  /**
   * Get all logs for a specific time period
   */
  async getLogs(startDate?: Date, endDate?: Date): Promise<SystemLog[]> {
    try {
      const allLogs = await spark.kv.get<SystemLog[]>('system_logs') || []
      
      if (!startDate && !endDate) return allLogs

      return allLogs.filter(log => {
        const logDate = new Date(log.timestamp)
        if (startDate && logDate < startDate) return false
        if (endDate && logDate > endDate) return false
        return true
      })
    } catch (error) {
      console.error('Failed to get logs:', error)
      return []
    }
  }
}

// Export singleton instance
export const loggingService = new LoggingService()

// Export utility functions for easy use in components
export const logUserAction = (action: string, target?: string, details?: Record<string, any>) => {
  loggingService.logActivity(action, target, details)
}

export const logError = (action: string, error: string, target?: string, details?: Record<string, any>) => {
  loggingService.logError(action, error, target, details)
}

export const getCurrentSessionId = () => loggingService.getCurrentSessionId()