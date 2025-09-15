import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Send, Mic, MicOff, Loader2, Upload } from 'lucide-react';
import { cn } from '../lib/utils';
import { useVoiceRecording } from '../hooks/useSpeechRecognition';

const ChatInput = ({ onSendMessage, onSendVoice, onImmediateVoiceMessage, isLoading = false, disabled = false, messageInput = '', onMessageInputChange }) => {
  const { t, i18n } = useTranslation();
  const [message, setMessage] = useState('');
  const textareaRef = useRef(null);
  const isRTL = i18n.language === 'ar';
  
  const {
    isSupported: voiceSupported,
    isRecording,
    audioBlob,
    error: voiceError,
    startRecording,
    stopRecording,
    resetRecording
  } = useVoiceRecording();

  // Handle voice recording completion
  useEffect(() => {
    if (audioBlob && onSendVoice) {
      // Create immediate voice message with local audio URL
      const audioUrl = URL.createObjectURL(audioBlob);
      if (onImmediateVoiceMessage) {
        onImmediateVoiceMessage(audioUrl);
      }
      
      // Send to API
      onSendVoice(audioBlob);
      resetRecording();
    }
  }, [audioBlob, onSendVoice, onImmediateVoiceMessage, resetRecording]);

  // Sync messageInput prop with local message state
  useEffect(() => {
    if (messageInput !== message) {
      setMessage(messageInput);
    }
  }, [messageInput]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!message.trim() || isLoading || disabled) {
      return;
    }

    onSendMessage(message.trim());
    setMessage('');
    onMessageInputChange?.(''); // Clear the parent's messageInput state
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleVoiceToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      resetRecording();
      startRecording();
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 z-10">
      <form onSubmit={handleSubmit} className="flex gap-2 items-end">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isRecording 
                ? t('chat.recording') 
                : t('chat.placeholder')
            }
            disabled={disabled || isLoading}
            className={cn(
              "min-h-[44px] max-h-32 resize-none transition-all",
              isRTL && "text-right",
              isRecording && "border-red-500 bg-red-50 dark:bg-red-950"
            )}
            rows={1}
          />
          
          {voiceError && (
            <div className="absolute -top-8 left-0 right-0 text-xs text-red-500 bg-background px-2 py-1 rounded border">
              {voiceError}
            </div>
          )}
        </div>

        {/* Voice Button */}
        {voiceSupported && (
          <Button
            type="button"
            variant={isRecording ? "destructive" : "outline"}
            size="icon"
            onClick={handleVoiceToggle}
            disabled={disabled || isLoading}
            className={cn(
              "h-11 w-11 transition-all",
              isRecording && "voice-recording"
            )}
            title={isRecording ? t('chat.recording') : t('chat.voice')}
          >
            {isRecording ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
        )}

        {/* Send Button */}
        <Button
          type="submit"
          disabled={!message.trim() || isLoading || disabled}
          className="h-11 w-11"
          size="icon"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className={cn(
              "h-4 w-4",
              isRTL && "-rotate-90"
            )} />
          )}
        </Button>
      </form>
      
      {/* Voice feedback */}
      {isRecording && (
        <div className="mt-2 text-center">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></div>
            {t('chat.recording')}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatInput;

