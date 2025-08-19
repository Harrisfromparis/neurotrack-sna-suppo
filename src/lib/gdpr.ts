import { DataExportRequest, DataDeletionRequest, PrivacySettings, User } from './types'
import { authService } from './auth'
import { loggingService } from './logging'

// spark is available as a global variable from @github/spark/spark
declare global {
  const spark: any
}

class GDPRService {
  /**
   * Export all user data for GDPR compliance
   */
  async requestDataExport(): Promise<DataExportRequest> {
    const currentUser = authService.getCurrentUser()
    if (!currentUser) throw new Error('Not authenticated')

    try {
      const exportRequest: DataExportRequest = {
        id: crypto.randomUUID(),
        userId: currentUser.id,
        requestedAt: new Date().toISOString(),
        status: 'pending'
      }

      // Store the request
      const existingRequests = await spark.kv.get<DataExportRequest[]>('data_export_requests') || []
      await spark.kv.set('data_export_requests', [...existingRequests, exportRequest])

      // Process the export asynchronously
      this.processDataExport(exportRequest.id)

      // Log the request
      loggingService.logSystemEvent('info', 'security', 'Data export requested', {
        userId: currentUser.id,
        requestId: exportRequest.id
      })

      return exportRequest
    } catch (error) {
      loggingService.logSystemEvent('error', 'security', 'Data export request failed', {
        userId: currentUser.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Process data export request
   */
  private async processDataExport(requestId: string): Promise<void> {
    try {
      const requests = await spark.kv.get<DataExportRequest[]>('data_export_requests') || []
      const requestIndex = requests.findIndex(r => r.id === requestId)
      
      if (requestIndex === -1) return

      const request = requests[requestIndex]
      
      // Update status to processing
      requests[requestIndex] = { ...request, status: 'processing' }
      await spark.kv.set('data_export_requests', requests)

      // Gather all user data
      const userData = await this.gatherUserData(request.userId)
      
      // Create export data
      const exportData = {
        user: userData.user,
        sessions: userData.sessions,
        activities: userData.activities,
        behaviorLogs: userData.behaviorLogs,
        activityLogs: userData.activityLogs,
        messages: userData.messages,
        exportedAt: new Date().toISOString(),
        exportVersion: '1.0.0'
      }

      // In a real application, you would upload this to a secure file storage
      // For now, we'll store it in KV with an expiration
      const exportKey = `export_${requestId}`
      await spark.kv.set(exportKey, exportData)

      // Update request with completion
      const completedAt = new Date().toISOString()
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      
      requests[requestIndex] = {
        ...request,
        status: 'completed',
        completedAt,
        downloadUrl: exportKey, // In production, this would be a secure download URL
        expiresAt
      }
      
      await spark.kv.set('data_export_requests', requests)

      loggingService.logSystemEvent('info', 'security', 'Data export completed', {
        userId: request.userId,
        requestId
      })
    } catch (error) {
      // Update request status to failed
      const requests = await spark.kv.get<DataExportRequest[]>('data_export_requests') || []
      const requestIndex = requests.findIndex(r => r.id === requestId)
      
      if (requestIndex !== -1) {
        requests[requestIndex] = { ...requests[requestIndex], status: 'failed' }
        await spark.kv.set('data_export_requests', requests)
      }

      loggingService.logSystemEvent('error', 'security', 'Data export failed', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Request data deletion for GDPR compliance
   */
  async requestDataDeletion(reason?: string): Promise<DataDeletionRequest> {
    const currentUser = authService.getCurrentUser()
    if (!currentUser) throw new Error('Not authenticated')

    try {
      const deletionRequest: DataDeletionRequest = {
        id: crypto.randomUUID(),
        userId: currentUser.id,
        requestedAt: new Date().toISOString(),
        status: 'pending',
        retentionPeriod: 30, // 30 days grace period
        reason
      }

      // Store the request
      const existingRequests = await spark.kv.get<DataDeletionRequest[]>('data_deletion_requests') || []
      await spark.kv.set('data_deletion_requests', [...existingRequests, deletionRequest])

      // Log the request
      loggingService.logSystemEvent('info', 'security', 'Data deletion requested', {
        userId: currentUser.id,
        requestId: deletionRequest.id,
        reason
      })

      return deletionRequest
    } catch (error) {
      loggingService.logSystemEvent('error', 'security', 'Data deletion request failed', {
        userId: currentUser.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Cancel data deletion request (within grace period)
   */
  async cancelDataDeletion(requestId: string): Promise<void> {
    const currentUser = authService.getCurrentUser()
    if (!currentUser) throw new Error('Not authenticated')

    try {
      const requests = await spark.kv.get<DataDeletionRequest[]>('data_deletion_requests') || []
      const requestIndex = requests.findIndex(r => r.id === requestId && r.userId === currentUser.id)
      
      if (requestIndex === -1) {
        throw new Error('Deletion request not found')
      }

      const request = requests[requestIndex]
      if (request.status !== 'pending') {
        throw new Error('Cannot cancel processed deletion request')
      }

      // Remove the request
      requests.splice(requestIndex, 1)
      await spark.kv.set('data_deletion_requests', requests)

      loggingService.logSystemEvent('info', 'security', 'Data deletion cancelled', {
        userId: currentUser.id,
        requestId
      })
    } catch (error) {
      loggingService.logSystemEvent('error', 'security', 'Failed to cancel data deletion', {
        userId: currentUser.id,
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Get user's privacy settings
   */
  async getPrivacySettings(): Promise<PrivacySettings> {
    const currentUser = authService.getCurrentUser()
    if (!currentUser) throw new Error('Not authenticated')

    try {
      const settings = await spark.kv.get<PrivacySettings>(`privacy_${currentUser.id}`)
      
      if (!settings) {
        // Create default privacy settings
        const defaultSettings: PrivacySettings = {
          id: crypto.randomUUID(),
          userId: currentUser.id,
          dataRetentionPeriod: 365, // 1 year
          allowAnalytics: false,
          allowMarketing: false,
          shareWithPartners: false,
          lastUpdated: new Date().toISOString()
        }
        
        await spark.kv.set(`privacy_${currentUser.id}`, defaultSettings)
        return defaultSettings
      }

      return settings
    } catch (error) {
      loggingService.logSystemEvent('error', 'security', 'Failed to get privacy settings', {
        userId: currentUser.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Update user's privacy settings
   */
  async updatePrivacySettings(updates: Partial<PrivacySettings>): Promise<PrivacySettings> {
    const currentUser = authService.getCurrentUser()
    if (!currentUser) throw new Error('Not authenticated')

    try {
      const currentSettings = await this.getPrivacySettings()
      
      const updatedSettings: PrivacySettings = {
        ...currentSettings,
        ...updates,
        lastUpdated: new Date().toISOString()
      }

      await spark.kv.set(`privacy_${currentUser.id}`, updatedSettings)

      loggingService.logSystemEvent('info', 'security', 'Privacy settings updated', {
        userId: currentUser.id,
        updatedFields: Object.keys(updates)
      })

      return updatedSettings
    } catch (error) {
      loggingService.logSystemEvent('error', 'security', 'Failed to update privacy settings', {
        userId: currentUser.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Gather all user data for export
   */
  private async gatherUserData(userId: string) {
    try {
      // Get user data
      const users = await spark.kv.get<User[]>('users') || []
      const user = users.find(u => u.id === userId)

      // Get session data
      const sessions = await loggingService.getSessionAnalytics()

      // Get user activities
      const activities = sessions?.activities || []

      // Get behavior logs where user was involved
      const behaviorLogs = await spark.kv.get('behavior-logs') || []
      const userBehaviorLogs = behaviorLogs.filter((log: any) => 
        log.recordedBy === userId || log.studentId === userId
      )

      // Get activity logs where user was involved
      const activityLogs = await spark.kv.get('activity-logs') || []
      const userActivityLogs = activityLogs.filter((log: any) => 
        log.recordedBy === userId
      )

      // Get messages involving the user
      const messages = await spark.kv.get('messages') || []
      const userMessages = messages.filter((msg: any) => 
        msg.senderId === userId || msg.recipientId === userId
      )

      return {
        user,
        sessions,
        activities,
        behaviorLogs: userBehaviorLogs,
        activityLogs: userActivityLogs,
        messages: userMessages
      }
    } catch (error) {
      loggingService.logSystemEvent('error', 'security', 'Failed to gather user data', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Get data export requests for current user
   */
  async getDataExportRequests(): Promise<DataExportRequest[]> {
    const currentUser = authService.getCurrentUser()
    if (!currentUser) throw new Error('Not authenticated')

    try {
      const requests = await spark.kv.get<DataExportRequest[]>('data_export_requests') || []
      return requests.filter(r => r.userId === currentUser.id)
    } catch (error) {
      loggingService.logSystemEvent('error', 'security', 'Failed to get export requests', {
        userId: currentUser.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Get data deletion requests for current user
   */
  async getDataDeletionRequests(): Promise<DataDeletionRequest[]> {
    const currentUser = authService.getCurrentUser()
    if (!currentUser) throw new Error('Not authenticated')

    try {
      const requests = await spark.kv.get<DataDeletionRequest[]>('data_deletion_requests') || []
      return requests.filter(r => r.userId === currentUser.id)
    } catch (error) {
      loggingService.logSystemEvent('error', 'security', 'Failed to get deletion requests', {
        userId: currentUser.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Download exported data
   */
  async downloadExportedData(exportKey: string): Promise<any> {
    const currentUser = authService.getCurrentUser()
    if (!currentUser) throw new Error('Not authenticated')

    try {
      const exportData = await spark.kv.get(exportKey)
      
      if (!exportData) {
        throw new Error('Export data not found or expired')
      }

      loggingService.logSystemEvent('info', 'security', 'Data export downloaded', {
        userId: currentUser.id,
        exportKey
      })

      return exportData
    } catch (error) {
      loggingService.logSystemEvent('error', 'security', 'Failed to download export data', {
        userId: currentUser.id,
        exportKey,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }
}

export const gdprService = new GDPRService()