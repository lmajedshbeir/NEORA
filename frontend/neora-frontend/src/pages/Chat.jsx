import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Loader2, MessageSquare, Trash2 } from 'lucide-react';
import ChatMessage from '../components/ChatMessage';
import ChatInput from '../components/ChatInput';
import ActionDropdown from '../components/ActionDropdown';
import { chatAPI } from '../api/chat';
import { useWebSocket } from '../hooks/useWebSocket';
import useAuthStore from '../store/auth';

const Chat = () => {
  
  const { t, i18n } = useTranslation();
  
  // Convert language code to full language name
  const getLanguageName = (languageCode) => {
    const languageMap = {
      'en': 'English',
      'ar': 'Arabic'
    };
    return languageMap[languageCode] || 'English';
  };
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef(null);
  const [streamingStartTime, setStreamingStartTime] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [responseTimeout, setResponseTimeout] = useState(null);
  const [apiErrorAdded, setApiErrorAdded] = useState(false);
  const [immediateError, setImmediateError] = useState(null);
  const [processedDoneMessages, setProcessedDoneMessages] = useState(new Set());
  const [lastUserId, setLastUserId] = useState(null);
  
  // WebSocket connection for real-time updates
  const { lastMessage, isConnected } = useWebSocket('/stream');

  // Clear cache when user changes to prevent data leakage
  useEffect(() => {
    if (user?.id && lastUserId && user.id !== lastUserId) {
      console.log('User changed, clearing React Query cache to prevent data leakage');
      queryClient.clear();
    }
    setLastUserId(user?.id);
  }, [user?.id, lastUserId, queryClient]);

  // Fetch messages
  const { 
    data: messagesData, 
    isLoading: messagesLoading, 
    error: messagesError 
  } = useQuery({
    queryKey: ['messages', user?.id],
    queryFn: () => chatAPI.getMessages({ limit: 50 }),
    enabled: !!user
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: ({ text, language }) => chatAPI.sendMessage(text, language),
    onSuccess: (data) => {
      console.log('Message sent successfully:', data);
      // Replace the temporary user message with the real one from API
      queryClient.setQueryData(['messages', user?.id], (old) => {
        if (!old) return { results: [data.user_message] };
        
        // Find and replace the temporary message with the real one
        const updatedResults = old.results.map(msg => {
          if (msg.id && msg.id.startsWith('temp-') && msg.role === 'user') {
            return data.user_message; // Replace with real message from API
          }
          return msg;
        });
        
        return {
          ...old,
          results: updatedResults
        };
      });
      
      // Don't invalidate queries here - let WebSocket handle the assistant message
    },
    onError: (error) => {
      console.error('Failed to send message:', error);
      console.log('Adding error message to state and cache');
      
      // Clear streaming message on error
      queryClient.setQueryData(['messages', user?.id], (old) => {
        if (!old) return old;
        return {
          ...old,
          results: old.results.filter(msg => !(msg.id && msg.id.startsWith('streaming-') && msg.role === 'assistant'))
        };
      });
      setStreamingStartTime(null);
      
      // Update the temporary message to show error status
      queryClient.setQueryData(['messages', user?.id], (old) => {
        if (!old) return old;
        
        const updatedResults = old.results.map(msg => {
          if (msg.id && msg.id.startsWith('temp-') && msg.role === 'user') {
            return { ...msg, status: 'error' };
          }
          return msg;
        });
        
        // Only add error message if WebSocket is not connected
        // (WebSocket will handle errors when connected)
        if (!isConnected) {
          const errorMessage = {
            id: `error-${Date.now()}`,
            role: 'assistant',
            text: t('chat.error'),
            status: 'error',
            created_at: new Date().toISOString()
          };
          
          // Set immediate error to force display
          setImmediateError(errorMessage);
          
          const newResults = [errorMessage, ...updatedResults];
          console.log('API error - Updated cache with error message:', newResults);
          return {
            ...old,
            results: newResults
          };
        }
        
        // If WebSocket is connected, just update user message status
        console.log('API error - WebSocket connected, letting WebSocket handle error');
        return {
          ...old,
          results: updatedResults
        };
      });
    }
  });

  // Send voice message mutation
  const sendVoiceMutation = useMutation({
    mutationFn: ({ audioBlob, language }) => chatAPI.sendVoiceMessage(audioBlob, language),
    onSuccess: (data) => {
      console.log('Voice message sent successfully:', data);
      // Replace the temporary voice message with the real one from API
      queryClient.setQueryData(['messages', user?.id], (old) => {
        if (!old) return { results: [data.user_message] };
        
        // Find and replace the temporary voice message with the real one
        const updatedResults = old.results.map(msg => {
          if (msg.id && msg.id.startsWith('temp-voice-') && msg.role === 'user') {
            // Clean up the local audio URL before replacing
            if (msg.audio_url && msg.audio_url.startsWith('blob:')) {
              URL.revokeObjectURL(msg.audio_url);
            }
            return data.user_message; // Replace with real message from API
          }
          return msg;
        });
        
        return {
          ...old,
          results: updatedResults
        };
      });
      
      // Don't invalidate queries here - let WebSocket handle the assistant message
    },
    onError: (error) => {
      console.error('Failed to send voice message:', error);
      
      // Clear streaming message on error
      queryClient.setQueryData(['messages', user?.id], (old) => {
        if (!old) return old;
        return {
          ...old,
          results: old.results.filter(msg => !(msg.id && msg.id.startsWith('streaming-') && msg.role === 'assistant'))
        };
      });
      setStreamingStartTime(null);
      
      // Update the temporary voice message to show error status
      queryClient.setQueryData(['messages', user?.id], (old) => {
        if (!old) return old;
        
        const updatedResults = old.results.map(msg => {
          if (msg.id && msg.id.startsWith('temp-voice-') && msg.role === 'user') {
            // Clean up the local audio URL on error
            if (msg.audio_url && msg.audio_url.startsWith('blob:')) {
              URL.revokeObjectURL(msg.audio_url);
            }
            return { ...msg, status: 'error', audio_url: null };
          }
          return msg;
        });
        
        // Only add error message if WebSocket is not connected
        // (WebSocket will handle errors when connected)
        if (!isConnected) {
          const errorMessage = {
            id: `error-${Date.now()}`,
            role: 'assistant',
            text: t('chat.error'),
            status: 'error',
            created_at: new Date().toISOString()
          };
          
          // Set immediate error to force display
          setImmediateError(errorMessage);
          
          const newResults = [errorMessage, ...updatedResults];
          console.log('API error - Updated cache with error message:', newResults);
          return {
            ...old,
            results: newResults
          };
        }
        
        // If WebSocket is connected, just update user message status
        console.log('API error - WebSocket connected, letting WebSocket handle error');
        return {
          ...old,
          results: updatedResults
        };
      });
    }
  });

  // Clear messages mutation
  const clearMessagesMutation = useMutation({
    mutationFn: chatAPI.clearMessages,
    onSuccess: (data) => {
      console.log('Messages cleared successfully:', data);
      // Clear the messages cache
      queryClient.setQueryData(['messages', user?.id], { results: [] });
      setShowClearConfirm(false);
      // Show success message (you could add a toast notification here)
    },
    onError: (error) => {
      console.error('Failed to clear messages:', error);
      setShowClearConfirm(false);
      // Show error message (you could add a toast notification here)
    }
  });

  // Handle WebSocket messages for streaming
  useEffect(() => {
    if (!lastMessage) return;

    const { type, data, message_id } = lastMessage;

    switch (type) {
      case 'delta':
        // Update the messages cache directly
        queryClient.setQueryData(['messages', user?.id], (old) => {
          if (!old) return old;
          
          const updatedResults = old.results.map(msg => {
            // Replace temporary streaming messages with the real streaming message
            if (msg.id && msg.id.startsWith('streaming-') && msg.role === 'assistant') {
              const newMessage = {
                id: message_id,
                role: 'assistant',
                text: data,
                status: 'streaming',
                created_at: new Date().toISOString()
              };
              console.log('Replacing temporary streaming message with real one:', newMessage);
              return newMessage;
            }
            // Update existing real streaming message with new text
            if (msg.id === message_id && msg.role === 'assistant') {
              const updatedMessage = {
                ...msg,
                text: msg.text + data
              };
              console.log('Building streaming message incrementally:', updatedMessage);
              return updatedMessage;
            }
            return msg;
          });
          
          return {
            ...old,
            results: updatedResults
          };
        });
        break;

      case 'done':
        // Check if we've already processed this done message
        if (processedDoneMessages.has(message_id)) {
          console.log('Already processed done message for:', message_id);
          return;
        }
        
        // Mark this message as processed
        setProcessedDoneMessages(prev => new Set([...prev, message_id]));
        
        // Streaming complete, refresh messages
        console.log('WebSocket done - clearing streaming message');
        // Ensure minimum display time for loading spinner
        const minDisplayTime = 2000; // 2 seconds minimum
        const elapsedTime = streamingStartTime ? Date.now() - streamingStartTime : 0;
        const remainingTime = Math.max(500, minDisplayTime - elapsedTime); // Minimum 500ms
        
        console.log(`Elapsed time: ${elapsedTime}ms, Remaining time: ${remainingTime}ms`);
        
        // Clear response timeout immediately
        if (responseTimeout) {
          clearTimeout(responseTimeout);
          setResponseTimeout(null);
        }
        
        // Wait for minimum display time before refreshing messages
        setTimeout(() => {
          console.log('Clearing streaming message after minimum display time');
          setStreamingStartTime(null);
          queryClient.invalidateQueries(['messages', user?.id]);
        }, remainingTime);
        break;

      case 'error':
        // Handle streaming error - show error message to user
        setStreamingStartTime(null);
        console.error('Streaming error:', lastMessage);
        
        // Clear response timeout
        if (responseTimeout) {
          clearTimeout(responseTimeout);
          setResponseTimeout(null);
        }
        
        // Check if there's already an immediate error to prevent duplicates
        if (!immediateError) {
          const errorMessage = {
            id: `error-${Date.now()}`,
            role: 'assistant',
            text: t('chat.error'),
            status: 'error',
            created_at: new Date().toISOString()
          };
          
          // Set immediate error to force display
          setImmediateError(errorMessage);
          console.log('WebSocket error - set immediate error:', errorMessage);
          
          // Also add to cache
          queryClient.setQueryData(['messages', user?.id], (old) => {
            if (!old) return { results: [errorMessage] };
            return {
              ...old,
              results: [errorMessage, ...old.results]
            };
          });
        } else {
          console.log('WebSocket error - immediate error already exists, skipping');
        }
        break;

      default:
        break;
    }
  }, [lastMessage, queryClient, responseTimeout, t]); // Removed immediateError from dependencies

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesData]);

  const handleSendMessage = (text) => {
    
    // Reset error flag for new message
    setApiErrorAdded(false);
    // Clear immediate error
    setImmediateError(null);
    // Clear processed done messages to prevent Set from growing indefinitely
    setProcessedDoneMessages(new Set());
    
    
    // Create user message object immediately
    const userMessage = {
      id: `temp-${Date.now()}`, // Temporary ID
      role: 'user',
      text: text,
      created_at: new Date().toISOString(),
      status: 'sending'
    };

    // Add user message to cache immediately
    queryClient.setQueryData(['messages', user?.id], (old) => {
      if (!old) return { results: [userMessage] };
      return {
        ...old,
        results: [userMessage, ...old.results]
      };
    });

    // Clear input immediately
    setMessageInput('');

    // Create streaming message to show loading state immediately
    const streamingMessage = {
      id: `streaming-${Date.now()}`,
      role: 'assistant',
      text: '',
      status: 'streaming',
      created_at: new Date().toISOString()
    };
    console.log('Creating streaming message in handleSendMessage:', streamingMessage);
    
    // Add streaming message to cache immediately
    queryClient.setQueryData(['messages', user?.id], (old) => {
      if (!old) return { results: [streamingMessage] };
      return {
        ...old,
        results: [streamingMessage, ...old.results]
      };
    });
    
    setStreamingStartTime(Date.now());

    // Set timeout to show error if no response in 30 seconds
    const timeout = setTimeout(() => {
      // Clear streaming message from cache
      queryClient.setQueryData(['messages', user?.id], (old) => {
        if (!old) return old;
        return {
          ...old,
          results: old.results.filter(msg => !(msg.id && msg.id.startsWith('streaming-') && msg.role === 'assistant'))
        };
      });
      setStreamingStartTime(null);
      
      // Add timeout error message
      const timeoutErrorMessage = {
        id: `timeout-error-${Date.now()}`,
        role: 'assistant',
        text: t('chat.error'),
        status: 'error',
        created_at: new Date().toISOString()
      };
      
      queryClient.setQueryData(['messages', user?.id], (old) => {
        if (!old) return { results: [timeoutErrorMessage] };
        return {
          ...old,
          results: [timeoutErrorMessage, ...old.results]
        };
      });
    }, 30000); // 30 seconds timeout
    
    setResponseTimeout(timeout);

    // Send to API
    sendMessageMutation.mutate({ text, language: getLanguageName(i18n.language) });
  };

  const handleActionSelect = (actionText) => {
    setMessageInput(actionText);
  };

  const handleSendVoice = (audioBlob) => {
    // Send to API (the immediate message is handled by handleImmediateVoiceMessage)
    sendVoiceMutation.mutate({ audioBlob, language: getLanguageName(i18n.language) });
  };

  const handleImmediateVoiceMessage = (audioUrl) => {
    // Reset error flag for new message
    setApiErrorAdded(false);
    // Clear immediate error
    setImmediateError(null);
    // Clear processed done messages to prevent Set from growing indefinitely
    setProcessedDoneMessages(new Set());
    
    // Create user voice message object immediately with local audio URL
    const userMessage = {
      id: `temp-voice-${Date.now()}`, // Temporary ID
      role: 'user',
      text: '[Voice Message]',
      audio_url: audioUrl, // Local audio URL for immediate playback
      created_at: new Date().toISOString(),
      status: 'sending'
    };

    // Add user message to cache immediately
    queryClient.setQueryData(['messages', user?.id], (old) => {
      if (!old) return { results: [userMessage] };
      return {
        ...old,
        results: [userMessage, ...old.results]
      };
    });

    // Create streaming message to show loading state immediately
    const streamingMessage = {
      id: `streaming-voice-${Date.now()}`,
      role: 'assistant',
      text: '',
      status: 'streaming',
      created_at: new Date().toISOString()
    };
    
    // Add streaming message to cache immediately
    queryClient.setQueryData(['messages', user?.id], (old) => {
      if (!old) return { results: [streamingMessage] };
      return {
        ...old,
        results: [streamingMessage, ...old.results]
      };
    });
    
    setStreamingStartTime(Date.now());
  };

  const handleClearChat = () => {
    setShowClearConfirm(true);
  };

  const handleConfirmClear = () => {
    clearMessagesMutation.mutate();
  };

  const handleCancelClear = () => {
    setShowClearConfirm(false);
  };

  const messages = messagesData?.results || [];
  // Reverse messages to show oldest first (chronological order)
  const orderedMessages = [...messages].reverse();
  
  // Combine messages with immediate error using useMemo
  const allMessages = useMemo(() => {
    let messages = [...orderedMessages];
    
    // Add immediate error if it exists
    if (immediateError) {
      messages = [immediateError, ...messages];
    }
    
    return messages;
  }, [orderedMessages, immediateError]);


  if (messagesLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (messagesError) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>
            {messagesError.response?.data?.error || t('errors.server')}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Chat Header - Fixed at top */}
      <div className="sticky top-16 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg executive-gradient flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-lg">{t('chat.title')}</h1>
              <p className="text-sm text-muted-foreground">
                {isConnected ? t('chat.connected') : t('chat.connecting')}
              </p>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <ActionDropdown onActionSelect={handleActionSelect} />
            {allMessages.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearChat}
                disabled={clearMessagesMutation.isPending}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {clearMessagesMutation.isPending ? t('chat.clearing') : t('chat.clearChat')}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 pb-24">
        {allMessages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <Card className="p-8 text-center max-w-md">
              <div className="space-y-4">
                <div className="h-16 w-16 rounded-full executive-gradient flex items-center justify-center mx-auto">
                  <MessageSquare className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    {t('chat.empty')}
                  </h3>
                  <p className="text-muted-foreground">
                    {t('chat.welcome')}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Show messages in chronological order (oldest first) */}
            {allMessages.map((message, index) => (
              <ChatMessage
                key={message.id || `streaming-${index}`}
                message={message}
                isStreaming={message.status === 'streaming'}
                streamingStartTime={streamingStartTime}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Chat Input */}
        <ChatInput 
          onSendMessage={handleSendMessage}
          onSendVoice={handleSendVoice}
          onImmediateVoiceMessage={handleImmediateVoiceMessage}
          isLoading={sendMessageMutation.isPending || sendVoiceMutation.isPending}
          disabled={!isConnected}
          messageInput={messageInput}
          onMessageInputChange={setMessageInput}
        />

      {/* Clear Chat Confirmation Dialog */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4 p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                  <Trash2 className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{t('chat.clearChat')}</h3>
                  <p className="text-sm text-muted-foreground">
                    This will permanently delete all your messages
                  </p>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Are you sure you want to clear all messages? This action cannot be undone.
              </p>
              
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={handleCancelClear}
                  disabled={clearMessagesMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleConfirmClear}
                  disabled={clearMessagesMutation.isPending}
                >
                  {clearMessagesMutation.isPending ? 'Clearing...' : 'Clear All'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Chat;

