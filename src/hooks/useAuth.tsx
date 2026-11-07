import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { User, AuthSession, GDPRConsent, PrivacySettings, DataExportRequest, DataDeletionRequest, Permission } from '@/lib/types'
import { authService } from '@/lib/auth'
import { gdprService } from '@/lib/gdpr'

interface AuthContextValue {
  user: User | null
  session: AuthSession | null
  /** True only during the initial session check on app start */
  isInitializing: boolean
  /** True while a sign-in, sign-up or sign-out request is in flight */
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ user: User; session: AuthSession }>
  register: (email: string, password: string, name: string, role?: User['role']) => Promise<{ user: User; session: AuthSession }>
  logout: () => Promise<void>
  hasPermission: (resource: Permission['resource'], action: Permission['actions'][number]) => boolean
  updateGDPRConsent: (consent: Partial<GDPRConsent>) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Provides shared authentication state to the whole app. Auth state has to live
 * in a single provider: with per-hook useState, a sign-in from LoginForm never
 * reaches App's isAuthenticated, so the dashboard never opens.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<AuthSession | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
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
        setIsInitializing(false)
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

  const hasPermission = useCallback((resource: Permission['resource'], action: Permission['actions'][number]) => {
    return authService.hasPermission(resource, action)
  }, [user])  // eslint-disable-line react-hooks/exhaustive-deps -- authService holds the state; recompute when the signed-in user changes

  const updateGDPRConsent = useCallback(async (consent: Partial<GDPRConsent>) => {
    if (!user) throw new Error('Not authenticated')
    
    await authService.updateGDPRConsent(consent)
    // Refresh user data
    const updatedUser = authService.getCurrentUser()
    if (updatedUser) {
      setUser(updatedUser)
    }
  }, [user])

  const value: AuthContextValue = {
    user,
    session,
    isInitializing,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    hasPermission,
    updateGDPRConsent
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Hook for authentication state and actions (shared via AuthProvider)
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
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

  const canCreate = useCallback((resource: Permission['resource']) => hasPermission(resource, 'create'), [hasPermission])
  const canRead = useCallback((resource: Permission['resource']) => hasPermission(resource, 'read'), [hasPermission])
  const canUpdate = useCallback((resource: Permission['resource']) => hasPermission(resource, 'update'), [hasPermission])
  const canDelete = useCallback((resource: Permission['resource']) => hasPermission(resource, 'delete'), [hasPermission])

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