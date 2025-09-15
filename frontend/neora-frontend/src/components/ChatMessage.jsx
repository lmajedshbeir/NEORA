import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Card } from './ui/card';
import { Bot, User, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import VoiceMessage from './VoiceMessage';

const TypingIndicator = () => (
  <div className="typing-indicator">
    <div className="typing-dot"></div>
    <div className="typing-dot"></div>
    <div className="typing-dot"></div>
  </div>
);

const ChatMessage = memo(({ message, isStreaming = false, streamingStartTime }) => {
  const { t, i18n } = useTranslation();
  const isUser = message.role === 'user';
  const isRTL = i18n.language === 'ar';
  const isVoiceMessage = message.text === '[Voice Message]' && message.audio_url;
  
  // Determine if we should show loading spinner
  const shouldShowSpinner = message.status === 'queued' || 
    (isStreaming && (!message.text || message.text.trim().length < 20)) ||
    (message.status === 'streaming' && (!message.text || message.text.trim().length < 20));
  
  // Debug logging for streaming messages
  if (isStreaming || message.status === 'streaming') {
    console.log('ChatMessage streaming debug:', {
      messageId: message.id,
      status: message.status,
      isStreaming,
      text: message.text,
      textLength: message.text?.length || 0,
      shouldShowSpinner
    });
  }
  

  return (
    <div className={cn(
      "flex gap-3 mb-4 message-enter",
      isUser ? "justify-end" : "justify-start",
      isRTL && isUser && "rtl:justify-start",
      isRTL && !isUser && "rtl:justify-end"
    )}>
      {!isUser && (
        <Avatar className="h-8 w-8 mt-1">
          <AvatarFallback className="bg-primary text-primary-foreground">
            <Bot className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
      
      <Card className={cn(
        "max-w-[80%] transition-all",
        // Use compact padding for loading states
        shouldShowSpinner ? "p-2" : "p-3",
        isUser 
? "bg-primary text-primary-foreground ml-auto" 
          : "bg-muted",
        isRTL && isUser && "rtl:mr-auto rtl:ml-0",
        isRTL && !isUser && "rtl:ml-auto rtl:mr-0"
      )}>
        <div className="text-base">
          {shouldShowSpinner ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {t('chat.processing')}
              </span>
            </div>
          ) : message.status === 'error' ? (
            <div className="flex items-center gap-2 text-red-500">
              <AlertCircle className="h-4 w-4" />
              <span>{t('chat.error')}</span>
            </div>
          ) : isVoiceMessage ? (
            <VoiceMessage 
              audioUrl={message.audio_url} 
              className="max-w-xs"
            />
          ) : (
            <div className="whitespace-pre-wrap break-words">
              {message.text}
            </div>
          )}
        </div>
        
        <div className={cn(
          "text-xs opacity-50",
          // Apply different margins based on state
          shouldShowSpinner ? "mt-1" : "-mt-4",
          isRTL && "rtl:text-left"
        )}>
          {new Date(message.created_at || Date.now()).toLocaleTimeString(
            i18n.language === 'ar' ? 'ar-SA' : 'en-US',
            { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: true
            }
          )}
        </div>
      </Card>
      
      {isUser && (
        <Avatar className="h-8 w-8 mt-1">
          <AvatarFallback className="bg-secondary text-secondary-foreground">
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
});

ChatMessage.displayName = 'ChatMessage';

export default ChatMessage;

