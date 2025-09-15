import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { authAPI } from '../api/auth';

const VerifyEmail = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState('');
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    console.log('VerifyEmail: Token from URL:', tokenParam);
    if (tokenParam) {
      setToken(tokenParam);
      // Auto-verify when component mounts
      console.log('VerifyEmail: Starting verification with token:', tokenParam);
      verifyMutation.mutate(tokenParam);
    } else {
      setStatus('error');
      setMessage('No verification token provided');
    }
  }, [searchParams]);

  const verifyMutation = useMutation({
    mutationFn: authAPI.verifyEmail,
    onSuccess: (data) => {
      console.log('VerifyEmail: Verification successful:', data);
      setStatus('success');
      setMessage(data.message || 'Email verified successfully! You can now log in.');
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    },
    onError: (error) => {
      console.error('VerifyEmail: Verification failed:', error);
      setStatus('error');
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.detail || 
                          error.message || 
                          'Failed to verify email. Please try again.';
      setMessage(errorMessage);
    }
  });

  const handleRetry = () => {
    if (token) {
      verifyMutation.mutate(token);
    }
  };

  const handleGoToLogin = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            {status === 'loading' && 'Verifying Email...'}
            {status === 'success' && 'Email Verified!'}
            {status === 'error' && 'Verification Failed'}
          </CardTitle>
          <CardDescription>
            {status === 'loading' && 'Please wait while we verify your email address'}
            {status === 'success' && 'Your email has been successfully verified'}
            {status === 'error' && 'There was an issue verifying your email'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Status Icon */}
          <div className="flex justify-center">
            {status === 'loading' && (
              <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle className="h-12 w-12 text-green-500" />
            )}
            {status === 'error' && (
              <XCircle className="h-12 w-12 text-red-500" />
            )}
          </div>

          {/* Message */}
          {message && (
            <Alert className={status === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
              <AlertDescription className={status === 'error' ? 'text-red-800' : 'text-green-800'}>
                {message}
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="space-y-2">
            {status === 'success' && (
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Redirecting to login page in 3 seconds...
                </p>
                <Button onClick={handleGoToLogin} className="w-full">
                  Go to Login
                </Button>
              </div>
            )}
            
            {status === 'error' && (
              <div className="space-y-2">
                <Button onClick={handleRetry} className="w-full" disabled={verifyMutation.isPending}>
                  {verifyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Try Again
                </Button>
                <Button variant="outline" onClick={handleGoToLogin} className="w-full">
                  Go to Login
                </Button>
              </div>
            )}
          </div>

          {/* Help Text */}
          <div className="text-center text-sm text-muted-foreground">
            <p>
              Need help?{' '}
              <Link to="/login" className="text-primary hover:underline">
                Contact Support
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmail;
