import { useState, useEffect, useCallback } from 'react'
import { User, AuthSession, GDPRConsent, PrivacySettings, DataExportRequest, DataDeletionRequest } from '@/lib/types'
import { authService } from '@/lib/auth'
import { gdprService } from '@/lib/gdpr'

/**
 * Hook for authentication state and actions
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<AuthSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true)
        const authenticated = await authService.isAuthenticated()
        setIsAuthenticated(authenticated)
        
        if (authenticated) {
          setUser(authService.getCurrentUser())
          setSession(authService.getCurrentSession())
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        setIsAuthenticated(false)
        setUser(null)
        setSession(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    try {
      setIsLoading(true)
      const result = await authService.login(email, password)
      setUser(result.user)
      setSession(result.session)
      setIsAuthenticated(true)
      return result
    } catch (error) {
      setIsAuthenticated(false)
      setUser(null)
      setSession(null)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  const register = useCallback(async (email: string, password: string, name: string, role: User['role'] = 'sna') => {
    try {
      setIsLoading(true)
      const newUser = await authService.register(email, password, name, role)
      // Auto-login after registration
      const result = await authService.login(email, password)
      setUser(result.user)
      setSession(result.session)
      setIsAuthenticated(true)
      return result
    } catch (error) {
      setIsAuthenticated(false)
      setUser(null)
      setSession(null)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      setIsLoading(true)
      await authService.logout()
      setUser(null)
      setSession(null)
      setIsAuthenticated(false)
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const hasPermission = useCallback((resource: string, action: string) => {
    return authService.hasPermission(resource as any, action as any)
  }, [])

  const updateGDPRConsent = useCallback(async (consent: Partial<GDPRConsent>) => {
    if (!user) throw new Error('Not authenticated')
    
    await authService.updateGDPRConsent(consent)
    // Refresh user data
    const updatedUser = authService.getCurrentUser()
    if (updatedUser) {
      setUser(updatedUser)
    }
  }, [user])

  return {
    user,
    session,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    hasPermission,
    updateGDPRConsent
  }
}

/**
 * Hook for GDPR compliance features
 */
export function useGDPR() {
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null)
  const [exportRequests, setExportRequests] = useState<DataExportRequest[]>([])
  const [deletionRequests, setDeletionRequests] = useState<DataDeletionRequest[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Load privacy settings and requests
  useEffect(() => {
    const loadGDPRData = async () => {
      try {
        setIsLoading(true)
        const [settings, exports, deletions] = await Promise.all([
          gdprService.getPrivacySettings(),
          gdprService.getDataExportRequests(),
          gdprService.getDataDeletionRequests()
        ])
        
        setPrivacySettings(settings)
        setExportRequests(exports)
        setDeletionRequests(deletions)
      } catch (error) {
        console.error('Failed to load GDPR data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadGDPRData()
  }, [])

  const updatePrivacySettings = useCallback(async (updates: Partial<PrivacySettings>) => {
    try {
      setIsLoading(true)
      const updatedSettings = await gdprService.updatePrivacySettings(updates)
      setPrivacySettings(updatedSettings)
      return updatedSettings
    } catch (error) {
      console.error('Failed to update privacy settings:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  const requestDataExport = useCallback(async () => {
    try {
      setIsLoading(true)
      const request = await gdprService.requestDataExport()
      setExportRequests(prev => [...prev, request])
      return request
    } catch (error) {
      console.error('Failed to request data export:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  const requestDataDeletion = useCallback(async (reason?: string) => {
    try {
      setIsLoading(true)
      const request = await gdprService.requestDataDeletion(reason)
      setDeletionRequests(prev => [...prev, request])
      return request
    } catch (error) {
      console.error('Failed to request data deletion:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  const cancelDataDeletion = useCallback(async (requestId: string) => {
    try {
      setIsLoading(true)
      await gdprService.cancelDataDeletion(requestId)
      setDeletionRequests(prev => prev.filter(r => r.id !== requestId))
    } catch (error) {
      console.error('Failed to cancel data deletion:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  const downloadExportedData = useCallback(async (exportKey: string) => {
    try {
      setIsLoading(true)
      const data = await gdprService.downloadExportedData(exportKey)
      
      // Create and trigger download
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `neurotrack-data-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      return data
    } catch (error) {
      console.error('Failed to download export data:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  const refreshRequests = useCallback(async () => {
    try {
      const [exports, deletions] = await Promise.all([
        gdprService.getDataExportRequests(),
        gdprService.getDataDeletionRequests()
      ])
      
      setExportRequests(exports)
      setDeletionRequests(deletions)
    } catch (error) {
      console.error('Failed to refresh requests:', error)
    }
  }, [])

  return {
    privacySettings,
    exportRequests,
    deletionRequests,
    isLoading,
    updatePrivacySettings,
    requestDataExport,
    requestDataDeletion,
    cancelDataDeletion,
    downloadExportedData,
    refreshRequests
  }
}

/**
 * Hook for role-based access control
 */
export function usePermissions() {
  const { user, hasPermission } = useAuth()

  const canCreate = useCallback((resource: string) => hasPermission(resource, 'create'), [hasPermission])
  const canRead = useCallback((resource: string) => hasPermission(resource, 'read'), [hasPermission])
  const canUpdate = useCallback((resource: string) => hasPermission(resource, 'update'), [hasPermission])
  const canDelete = useCallback((resource: string) => hasPermission(resource, 'delete'), [hasPermission])

  const isAdmin = user?.role === 'administrator'
  const isTeacher = user?.role === 'teacher'
  const isSNA = user?.role === 'sna'
  const isSubstitute = user?.role === 'substitute'

  return {
    user,
    canCreate,
    canRead,
    canUpdate,
    canDelete,
    isAdmin,
    isTeacher,
    isSNA,
    isSubstitute,
    hasPermission
  }
}