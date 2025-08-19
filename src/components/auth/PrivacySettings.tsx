import { useState, useEffect } from 'react'
import { useGDPR, useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Shield, 
  Download, 
  Trash, 
  Clock, 
  Check, 
  X, 
  AlertTriangle,
  FileText,
  Settings,
  Eye
} from '@phosphor-icons/react'
import { toast } from 'sonner'

export function PrivacySettings() {
  const { user, updateGDPRConsent } = useAuth()
  const {
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
  } = useGDPR()

  const [localSettings, setLocalSettings] = useState(privacySettings)
  const [deletionReason, setDeletionReason] = useState('')
  const [showDeletionForm, setShowDeletionForm] = useState(false)

  useEffect(() => {
    setLocalSettings(privacySettings)
  }, [privacySettings])

  const handleSaveSettings = async () => {
    if (!localSettings) return

    try {
      await updatePrivacySettings({
        dataRetentionPeriod: localSettings.dataRetentionPeriod,
        allowAnalytics: localSettings.allowAnalytics,
        allowMarketing: localSettings.allowMarketing,
        shareWithPartners: localSettings.shareWithPartners
      })
      toast.success('Privacy settings updated successfully')
    } catch (error) {
      toast.error('Failed to update privacy settings')
    }
  }

  const handleUpdateConsent = async (purposeId: string, consented: boolean) => {
    if (!user?.gdprConsent) return

    try {
      const updatedPurposes = user.gdprConsent.dataProcessingPurposes.map(purpose =>
        purpose.id === purposeId ? { ...purpose, consented } : purpose
      )

      await updateGDPRConsent({
        dataProcessingPurposes: updatedPurposes,
        lastUpdated: new Date().toISOString()
      })
      
      toast.success('Consent preferences updated')
    } catch (error) {
      toast.error('Failed to update consent preferences')
    }
  }

  const handleRequestExport = async () => {
    try {
      await requestDataExport()
      toast.success('Data export request submitted. You will be notified when ready.')
      refreshRequests()
    } catch (error) {
      toast.error('Failed to request data export')
    }
  }

  const handleRequestDeletion = async () => {
    try {
      await requestDataDeletion(deletionReason)
      toast.success('Data deletion request submitted. You have 30 days to cancel.')
      setShowDeletionForm(false)
      setDeletionReason('')
      refreshRequests()
    } catch (error) {
      toast.error('Failed to request data deletion')
    }
  }

  const handleCancelDeletion = async (requestId: string) => {
    try {
      await cancelDataDeletion(requestId)
      toast.success('Data deletion request cancelled')
      refreshRequests()
    } catch (error) {
      toast.error('Failed to cancel deletion request')
    }
  }

  const handleDownloadExport = async (exportKey: string) => {
    try {
      await downloadExportedData(exportKey)
      toast.success('Data export downloaded')
    } catch (error) {
      toast.error('Failed to download export data')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
      case 'processing':
        return <Badge variant="secondary"><Settings className="h-3 w-3 mr-1" />Processing</Badge>
      case 'completed':
        return <Badge variant="default"><Check className="h-3 w-3 mr-1" />Completed</Badge>
      case 'failed':
        return <Badge variant="destructive"><X className="h-3 w-3 mr-1" />Failed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (!user) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Privacy & Data Protection</h1>
          <p className="text-muted-foreground">Manage your privacy settings and data rights</p>
        </div>
      </div>

      <Tabs defaultValue="consent" className="space-y-6">
        <TabsList>
          <TabsTrigger value="consent">Data Consent</TabsTrigger>
          <TabsTrigger value="settings">Privacy Settings</TabsTrigger>
          <TabsTrigger value="requests">Data Requests</TabsTrigger>
        </TabsList>

        {/* Data Consent Tab */}
        <TabsContent value="consent">
          <Card>
            <CardHeader>
              <CardTitle>Data Processing Consent</CardTitle>
              <CardDescription>
                Control how your data is processed according to GDPR regulations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {user.gdprConsent.dataProcessingPurposes.map((purpose) => (
                <div key={purpose.id} className="flex items-center justify-between space-y-2">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={purpose.id}>{purpose.name}</Label>
                      {purpose.required && (
                        <Badge variant="secondary" className="text-xs">Required</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{purpose.description}</p>
                  </div>
                  <Switch
                    id={purpose.id}
                    checked={purpose.consented}
                    disabled={purpose.required}
                    onCheckedChange={(checked) => handleUpdateConsent(purpose.id, checked)}
                  />
                </div>
              ))}
              
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-primary mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="font-medium">Consent Information</h4>
                    <p className="text-sm text-muted-foreground">
                      Consent given on: {new Date(user.gdprConsent.consentDate).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Version: {user.gdprConsent.consentVersion}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Privacy Preferences</CardTitle>
              <CardDescription>
                Configure your privacy and data retention preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="retention">Data Retention Period (days)</Label>
                <Input
                  id="retention"
                  type="number"
                  min="30"
                  max="2555" // 7 years
                  value={localSettings?.dataRetentionPeriod || 365}
                  onChange={(e) => setLocalSettings(prev => prev ? {
                    ...prev,
                    dataRetentionPeriod: parseInt(e.target.value)
                  } : null)}
                />
                <p className="text-sm text-muted-foreground">
                  How long to retain your data (minimum 30 days, maximum 7 years)
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Analytics & Performance</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow us to analyze usage patterns to improve the application
                    </p>
                  </div>
                  <Switch
                    checked={localSettings?.allowAnalytics || false}
                    onCheckedChange={(checked) => setLocalSettings(prev => prev ? {
                      ...prev,
                      allowAnalytics: checked
                    } : null)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Marketing Communications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive updates about new features and improvements
                    </p>
                  </div>
                  <Switch
                    checked={localSettings?.allowMarketing || false}
                    onCheckedChange={(checked) => setLocalSettings(prev => prev ? {
                      ...prev,
                      allowMarketing: checked
                    } : null)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Data Sharing with Partners</Label>
                    <p className="text-sm text-muted-foreground">
                      Share anonymized data with educational research partners
                    </p>
                  </div>
                  <Switch
                    checked={localSettings?.shareWithPartners || false}
                    onCheckedChange={(checked) => setLocalSettings(prev => prev ? {
                      ...prev,
                      shareWithPartners: checked
                    } : null)}
                  />
                </div>
              </div>

              <Button onClick={handleSaveSettings} disabled={isLoading}>
                Save Privacy Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Requests Tab */}
        <TabsContent value="requests">
          <div className="space-y-6">
            {/* Data Export Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Data Export
                </CardTitle>
                <CardDescription>
                  Download a copy of all your data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={handleRequestExport} disabled={isLoading}>
                  <Download className="h-4 w-4 mr-2" />
                  Request Data Export
                </Button>

                {exportRequests.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium">Export Requests</h4>
                    {exportRequests.map((request) => (
                      <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">
                            Requested: {new Date(request.requestedAt).toLocaleString()}
                          </p>
                          {request.completedAt && (
                            <p className="text-sm text-muted-foreground">
                              Completed: {new Date(request.completedAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          {getStatusBadge(request.status)}
                          {request.status === 'completed' && request.downloadUrl && (
                            <Button
                              size="sm"
                              onClick={() => handleDownloadExport(request.downloadUrl!)}
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Download
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Data Deletion Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trash className="h-5 w-5" />
                  Data Deletion
                </CardTitle>
                <CardDescription>
                  Permanently delete your account and all associated data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Warning:</strong> Data deletion is permanent and cannot be undone. 
                    You have 30 days to cancel the request.
                  </AlertDescription>
                </Alert>

                {!showDeletionForm ? (
                  <Button 
                    variant="destructive" 
                    onClick={() => setShowDeletionForm(true)}
                    disabled={isLoading}
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    Request Account Deletion
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <Label htmlFor="deletion-reason">Reason for deletion (optional)</Label>
                    <Textarea
                      id="deletion-reason"
                      placeholder="Please let us know why you're deleting your account..."
                      value={deletionReason}
                      onChange={(e) => setDeletionReason(e.target.value)}
                    />
                    <div className="flex gap-3">
                      <Button 
                        variant="destructive" 
                        onClick={handleRequestDeletion}
                        disabled={isLoading}
                      >
                        Confirm Deletion Request
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setShowDeletionForm(false)
                          setDeletionReason('')
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {deletionRequests.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium">Deletion Requests</h4>
                    {deletionRequests.map((request) => (
                      <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">
                            Requested: {new Date(request.requestedAt).toLocaleString()}
                          </p>
                          {request.retentionPeriod && (
                            <p className="text-sm text-muted-foreground">
                              Grace period: {request.retentionPeriod} days
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          {getStatusBadge(request.status)}
                          {request.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancelDeletion(request.id)}
                            >
                              Cancel Request
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}