import { useEffect, useRef } from 'react'
import { loggingService, logUserAction, logError } from '@/lib/logging'

/**
 * Hook to provide logging capabilities in React components
 */
export function useLogging() {
  const componentMountTime = useRef<number>(Date.now())
  const componentName = useRef<string>('')

  useEffect(() => {
    // Try to get component name from call stack
    const stack = new Error().stack
    const match = stack?.match(/at (\w+)/)
    componentName.current = match?.[1] || 'UnknownComponent'

    // Log component mount
    logUserAction('component_mounted', componentName.current)

    return () => {
      // Log component unmount and duration
      const duration = Math.round((Date.now() - componentMountTime.current) / 1000)
      logUserAction('component_unmounted', componentName.current, { 
        durationSeconds: duration 
      })
    }
  }, [])

  return {
    logAction: logUserAction,
    logError,
    getCurrentSessionId: () => loggingService.getCurrentSessionId(),
    getCurrentUserId: () => loggingService.getCurrentUserId()
  }
}

/**
 * Hook to track user interactions on specific elements
 */
export function useInteractionTracking(elementId: string) {
  const { logAction } = useLogging()

  const trackClick = (details?: Record<string, any>) => {
    logAction('click', elementId, details)
  }

  const trackHover = (details?: Record<string, any>) => {
    logAction('hover', elementId, details)
  }

  const trackFocus = (details?: Record<string, any>) => {
    logAction('focus', elementId, details)
  }

  const trackInput = (value: string, details?: Record<string, any>) => {
    logAction('input_change', elementId, { value, ...details })
  }

  const trackSubmit = (formData?: Record<string, any>) => {
    logAction('form_submit', elementId, formData)
  }

  return {
    trackClick,
    trackHover,
    trackFocus,
    trackInput,
    trackSubmit
  }
}

/**
 * Hook to track page views and navigation
 */
export function usePageTracking(pageName: string) {
  const { logAction } = useLogging()
  const pageStartTime = useRef<number>(Date.now())

  useEffect(() => {
    // Log page view
    logAction('page_view', pageName, {
      url: window.location.href,
      referrer: document.referrer
    })

    return () => {
      // Log page exit and time spent
      const timeSpent = Math.round((Date.now() - pageStartTime.current) / 1000)
      logAction('page_exit', pageName, { 
        timeSpentSeconds: timeSpent 
      })
    }
  }, [pageName, logAction])

  const trackNavigation = (destination: string) => {
    logAction('navigation', destination, {
      from: pageName,
      timestamp: new Date().toISOString()
    })
  }

  return { trackNavigation }
}

/**
 * Hook to track form interactions
 */
export function useFormTracking(formId: string) {
  const { logAction, logError } = useLogging()
  const formStartTime = useRef<number | null>(null)
  const fieldInteractions = useRef<Record<string, number>>({})

  const trackFormStart = () => {
    formStartTime.current = Date.now()
    logAction('form_start', formId)
  }

  const trackFieldInteraction = (fieldName: string) => {
    fieldInteractions.current[fieldName] = (fieldInteractions.current[fieldName] || 0) + 1
    logAction('field_interaction', `${formId}.${fieldName}`, {
      interactionCount: fieldInteractions.current[fieldName]
    })
  }

  const trackFormSubmit = (formData: Record<string, any>, success: boolean = true) => {
    const duration = formStartTime.current 
      ? Math.round((Date.now() - formStartTime.current) / 1000)
      : 0

    if (success) {
      logAction('form_submit_success', formId, {
        durationSeconds: duration,
        fieldInteractions: fieldInteractions.current,
        dataKeys: Object.keys(formData)
      })
    } else {
      logError('form_submit', 'Form submission failed', formId, {
        durationSeconds: duration,
        fieldInteractions: fieldInteractions.current
      })
    }
  }

  const trackValidationError = (fieldName: string, error: string) => {
    logError('form_validation', error, `${formId}.${fieldName}`)
  }

  return {
    trackFormStart,
    trackFieldInteraction,
    trackFormSubmit,
    trackValidationError
  }
}