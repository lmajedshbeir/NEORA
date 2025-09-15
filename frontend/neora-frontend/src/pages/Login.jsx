import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { authAPI } from '../api/auth';
import useAuthStore from '../store/auth';

const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setUser, clearAuth } = useAuthStore();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Handle email verification messages from URL parameters
  useEffect(() => {
    const messageParam = searchParams.get('message');
    const errorParam = searchParams.get('error');
    
    // Clear any existing authentication state when coming from email verification
    if (messageParam || errorParam) {
      clearAuth();
      queryClient.clear();
    }
    
    if (messageParam === 'verified_success') {
      setMessage('Email verified successfully! You can now log in.');
    } else if (messageParam === 'already_verified') {
      setMessage('Email is already verified. You can log in.');
    } else if (errorParam === 'no_token') {
      setError('No verification token provided.');
    } else if (errorParam === 'invalid_token') {
      setError('Invalid or expired verification token.');
    }
  }, [searchParams, clearAuth, queryClient]);

  const loginMutation = useMutation({
    mutationFn: authAPI.login,
    onSuccess: (data) => {
      // Clear all React Query cache to ensure clean state for new user
      queryClient.clear();
      setUser(data.user);
      navigate('/chat');
    },
    onError: (error) => {
      // Surface full error in console to debug client-side issues
      try { /* eslint-disable no-console */ console.error('Login error', error?.response || error); } catch (_) {}
      const data = error.response?.data;
      let message = data?.error || data?.detail;
      if (!message && data && typeof data === 'object') {
        try {
          const collected = Object.values(data).flat().filter(Boolean);
          if (collected.length > 0) message = collected.join(' ');
        } catch (_) {}
      }
      if (!message && error.message) message = error.message;
      if (!message) message = t('errors.server');
      setError(message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setMessage(''); // Clear previous messages on new login attempt
    
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    loginMutation.mutate(formData);
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="h-12 w-12 rounded-lg executive-gradient flex items-center justify-center">
              <span className="text-white font-bold text-lg">N</span>
            </div>
          </div>
          <CardTitle className="text-2xl text-center">
            {t('auth.login.title')}
          </CardTitle>
          <CardDescription className="text-center">
            {t('auth.login.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {message && (
              <Alert className="border-green-200 bg-green-50">
                <AlertDescription className="text-green-800">{message}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.login.email')}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="john@example.com"
                required
                disabled={loginMutation.isPending}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.login.password')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  required
                  disabled={loginMutation.isPending}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loginMutation.isPending}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('common.loading')}
                </>
              ) : (
                t('auth.login.submit')
              )}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <Link 
              to="/forgot-password" 
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {t('auth.login.forgot')}
            </Link>
            
            <div className="text-sm text-muted-foreground">
              {t('auth.login.noAccount')}{' '}
              <Link 
                to="/register" 
                className="text-primary hover:underline font-medium"
              >
                {t('auth.login.signUp')}
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;

