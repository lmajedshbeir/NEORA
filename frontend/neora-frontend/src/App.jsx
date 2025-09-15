import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';
import Settings from './pages/Settings';
import VerifyEmail from './pages/VerifyEmail';
import { ThemeProvider } from './contexts/ThemeContext';
import useAuthStore from './store/auth';
import './i18n/i18n';
import './App.css';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  const { i18n } = useTranslation();
  const { isAuthenticated, user, clearAuth } = useAuthStore();

  // Debug authentication state
  useEffect(() => {
    console.log('App: Authentication state changed:', { isAuthenticated, user: user?.email });
  }, [isAuthenticated, user]);

  // Clear authentication state if coming from email verification
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const messageParam = urlParams.get('message');
    const errorParam = urlParams.get('error');
    
    console.log('App: URL parameters:', { messageParam, errorParam });
    
    // If we have verification parameters, clear authentication state
    if (messageParam || errorParam) {
      console.log('App: Clearing authentication state due to email verification parameters');
      clearAuth();
      queryClient.clear();
    }
  }, [clearAuth, queryClient]);

  // Set initial language and direction
  useEffect(() => {
    const language = user?.preferred_language || i18n.language || 'en';
    i18n.changeLanguage(language);
    
    const html = document.documentElement;
    html.setAttribute('lang', language);
    html.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
  }, [user, i18n]);

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <Router>
          <div className="min-h-screen bg-background text-foreground flex flex-col">
            <Navbar />
            
            <main className="flex-1 flex flex-col">
              <Routes>
                {/* Public routes */}
                <Route 
                  path="/login" 
                  element={
                    isAuthenticated ? <Navigate to="/chat" replace /> : <Login />
                  } 
                />
                <Route 
                  path="/register" 
                  element={
                    isAuthenticated ? <Navigate to="/chat" replace /> : <Register />
                  } 
                />
                <Route 
                  path="/verify-email" 
                  element={<VerifyEmail />} 
                />
                
                {/* Protected routes */}
                <Route 
                  path="/chat" 
                  element={
                    <ProtectedRoute>
                      <Chat />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/settings" 
                  element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Default redirects */}
                <Route 
                  path="/" 
                  element={
                    <Navigate to={isAuthenticated ? "/chat" : "/login"} replace />
                  } 
                />
                <Route 
                  path="*" 
                  element={
                    <Navigate to={isAuthenticated ? "/chat" : "/login"} replace />
                  } 
                />
              </Routes>
            </main>
          </div>
        </Router>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
