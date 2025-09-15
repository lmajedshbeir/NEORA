import { useState, useRef } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { useAudioPlayer } from '../hooks/useAudioPlayer';

const VoiceMessage = ({ audioUrl, className }) => {
  const [isHovered, setIsHovered] = useState(false);
  const progressRef = useRef(null);
  
  const {
    isPlaying,
    duration,
    currentTime,
    isLoading,
    error,
    toggle,
    seek,
    formatTime
  } = useAudioPlayer(audioUrl);

  const handleProgressClick = (e) => {
    if (!progressRef.current || !duration) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;
    
    seek(newTime);
  };

  const progressPercentage = duration ? (currentTime / duration) * 100 : 0;

  if (error) {
    return (
      <div className={cn(
        "flex items-center gap-3 p-3 rounded-xl",
        "bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20",
        "border border-red-200/50 dark:border-red-700/30",
        "text-red-600 dark:text-red-400",
        className
      )}>
        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/30">
          <Volume2 className="h-4 w-4" />
        </div>
        <span className="text-sm font-medium">Failed to load audio</span>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "relative flex items-center gap-3 p-3 rounded-xl transition-all duration-200 voice-message",
        "bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20",
        "border border-purple-200/50 dark:border-purple-700/30",
        "shadow-sm hover:shadow-md",
        isHovered && "scale-[1.01] shadow-lg",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Play/Pause Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggle}
        disabled={isLoading}
        className={cn(
          "h-10 w-10 rounded-full transition-all duration-200",
          "bg-gradient-to-br from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600",
          "text-white shadow-lg hover:shadow-xl",
          "hover:scale-105 active:scale-95",
          isLoading && "animate-pulse"
        )}
      >
        {isLoading ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : isPlaying ? (
          <Pause className="h-5 w-5" />
        ) : (
          <Play className="h-5 w-5 ml-0.5" />
        )}
      </Button>

      {/* Progress Section */}
      <div className="flex-1 flex flex-col gap-1">
        {/* Progress Bar */}
        <div
          ref={progressRef}
          className="relative h-3 rounded-full cursor-pointer group bg-gray-200 dark:bg-gray-700 overflow-hidden"
          onClick={handleProgressClick}
        >
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-full" />
          
          {/* Progress Fill */}
          <div
            className="absolute top-0 left-0 h-full rounded-full transition-all duration-150 ease-out"
            style={{ 
              width: `${progressPercentage}%`,
              background: "linear-gradient(90deg, #8b5cf6 0%, #3b82f6 100%)"
            }}
          />
          
          {/* Hover Effect */}
          <div className="absolute inset-0 bg-white/20 dark:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-full" />
        </div>
        
        {/* Time Display */}
        <div className="flex justify-center items-center text-xs font-medium">
          <span className="text-gray-500 dark:text-gray-400">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Volume Icon */}
      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
        <Volume2 className="h-4 w-4" />
      </div>
    </div>
  );
};

export default VoiceMessage;
