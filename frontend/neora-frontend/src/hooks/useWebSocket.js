import { useEffect, useRef, useState } from 'react';
import useAuthStore from '../store/auth';

// Get WebSocket base URL from environment variables
const WS_URL = import.meta.env.VITE_WS_BASE_URL || 'wss://neora-backend.onrender.com/ws';

// Log environment variable status
if (!import.meta.env.VITE_WS_BASE_URL) {
  console.warn('VITE_WS_BASE_URL environment variable is not set! Using default:', WS_URL);
}

export const useWebSocket = (endpoint = '/stream') => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const { isAuthenticated } = useAuthStore();

  const connect = () => {
    if (!isAuthenticated) {
      console.log('WebSocket: Not connecting - user not authenticated');
      return;
    }

    // Prevent multiple connections
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('WebSocket: Already connected, skipping');
      return;
    }

    // Close existing connection if it exists
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      // Get JWT token from cookies (since we use HTTP-only cookies)
      const token = document.cookie.split('; ').find(row => row.startsWith('access_token='))?.split('=')[1];
      
      let wsUrl = `${WS_URL}${endpoint}`;
      
      // Add token as query parameter if available (fallback for development)
      if (token) {
        wsUrl += `?token=${encodeURIComponent(token)}`;
      }
      
      console.log('WebSocket: Connecting to:', wsUrl);
      console.log('WebSocket: WS_URL:', WS_URL);
      console.log('WebSocket: Endpoint:', endpoint);
      console.log('WebSocket: Available cookies:', document.cookie);
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        
        // Log specific close codes for debugging
        if (event.code === 4001) {
          console.error('WebSocket authentication failed - check JWT token');
          setError('Authentication failed');
        } else if (event.code === 1006) {
          console.error('WebSocket connection closed abnormally');
          setError('Connection lost');
        }
        
        // Attempt to reconnect if not a normal closure and not auth failure
        if (event.code !== 1000 && event.code !== 4001 && isAuthenticated) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('WebSocket connection error');
      };
    } catch (err) {
      console.error('Failed to create WebSocket connection:', err);
      setError('Failed to connect to WebSocket');
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Component unmounting');
      wsRef.current = null;
    }
    
    setIsConnected(false);
  };

  const sendMessage = (message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated]); // Removed endpoint from dependencies since it's static

  return {
    isConnected,
    lastMessage,
    error,
    sendMessage,
    connect,
    disconnect
  };
};

