import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Separator } from '../components/ui/separator';
import { Loader2, Save, Settings as SettingsIcon, User, Globe } from 'lucide-react';
import { authAPI } from '../api/auth';
import useAuthStore from '../store/auth';
import LanguageSwitch from '../components/LanguageSwitch';

const Settings = () => {
  const { t } = useTranslation();
  const { user, updateUser } = useAuthStore();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || ''
  });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const updateProfileMutation = useMutation({
    mutationFn: authAPI.updateProfile,
    onSuccess: (data) => {
      updateUser(data.user);
      setSuccess('Profile updated successfully');
      setError('');
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (error) => {
      const message = error.response?.data?.error || 
                    error.response?.data?.detail || 
                    t('errors.server');
      setError(message);
      setSuccess('');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // Only send changed fields
    const changes = {};
    if (formData.first_name !== user?.first_name) {
      changes.first_name = formData.first_name;
    }
    if (formData.last_name !== user?.last_name) {
      changes.last_name = formData.last_name;
    }
    if (formData.email !== user?.email) {
      changes.email = formData.email;
    }

    if (Object.keys(changes).length === 0) {
      setError('No changes to save');
      return;
    }

    updateProfileMutation.mutate(changes);
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const hasChanges = () => {
    return formData.first_name !== user?.first_name ||
           formData.last_name !== user?.last_name ||
           formData.email !== user?.email;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg executive-gradient flex items-center justify-center">
            <SettingsIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
            <p className="text-muted-foreground">
              Manage your account settings and preferences
            </p>
          </div>
        </div>

        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t('settings.profile')}
            </CardTitle>
            <CardDescription>
              Update your personal information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {success && (
                <Alert>
                  <AlertDescription className="text-green-600">
                    {success}
                  </AlertDescription>
                </Alert>
              )}
              
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    name="first_name"
                    type="text"
                    value={formData.first_name}
                    onChange={handleChange}
                    placeholder="John"
                    disabled={updateProfileMutation.isPending}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    name="last_name"
                    type="text"
                    value={formData.last_name}
                    onChange={handleChange}
                    placeholder="Doe"
                    disabled={updateProfileMutation.isPending}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="john@example.com"
                  disabled={updateProfileMutation.isPending}
                />
              </div>

              <Button 
                type="submit" 
                disabled={!hasChanges() || updateProfileMutation.isPending}
                className="w-full sm:w-auto"
              >
                {updateProfileMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('common.loading')}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {t('settings.save')}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Language Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              {t('settings.language')}
            </CardTitle>
            <CardDescription>
              Choose your preferred language
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Interface Language</p>
                <p className="text-sm text-muted-foreground">
                  Select the language for the user interface
                </p>
              </div>
              <LanguageSwitch />
            </div>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>
              View your account details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-muted-foreground">Account ID</p>
                <p className="font-mono text-xs">{user?.id}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Member Since</p>
                <p>{new Date(user?.date_joined).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Email Verified</p>
                <p className={user?.is_verified ? 'text-green-600' : 'text-red-600'}>
                  {user?.is_verified ? 'Verified' : 'Not Verified'}
                </p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Account Status</p>
                <p className="text-green-600">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;

