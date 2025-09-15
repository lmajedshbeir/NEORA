import { useState, useRef, useEffect, useCallback } from 'react';

export const useAudioPlayer = (audioUrl) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const audioRef = useRef(null);

  // Initialize audio element
  useEffect(() => {
    if (!audioUrl) return;

    console.log('Loading audio URL:', audioUrl);
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    // Set audio properties for better playback
    audio.preload = 'auto';  // Preload the entire audio for better playback
    audio.crossOrigin = 'anonymous';
    audio.volume = 1.0;
    
    // Additional audio settings for better quality
    audio.muted = false;
    audio.defaultMuted = false;
    
    // Force load the audio completely
    audio.load();

    const handleLoadedMetadata = () => {
      console.log('Loaded metadata - duration:', audio.duration, 'type:', typeof audio.duration);
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      console.log('Time update - currentTime:', audio.currentTime, 'duration:', audio.duration);
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      console.log('Audio ended, resetting time to 0');
      setIsPlaying(false);
      setCurrentTime(0);
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
    };

    const handleError = (e) => {
      console.error('Audio error:', e);
      console.error('Audio error details:', {
        error: e,
        code: e.target?.error?.code,
        message: e.target?.error?.message,
        src: e.target?.src,
        networkState: e.target?.networkState,
        readyState: e.target?.readyState
      });
      setError('Failed to load audio');
      setIsLoading(false);
      setIsPlaying(false);
    };

    const handleLoadStart = () => {
      setIsLoading(true);
      setError(null);
    };

    const handleCanPlay = () => {
      console.log('Audio can play - duration:', audio.duration, 'readyState:', audio.readyState);
      setIsLoading(false);
    };

    const handleWaiting = () => {
      console.log('Audio waiting for data...');
      setIsLoading(true);
    };

    const handleStalled = () => {
      console.log('Audio stalled - buffering issue');
      setIsLoading(true);
    };

    const handleSuspend = () => {
      console.log('Audio suspended');
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('stalled', handleStalled);
    audio.addEventListener('suspend', handleSuspend);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('stalled', handleStalled);
      audio.removeEventListener('suspend', handleSuspend);
      audio.pause();
      audio.src = '';
    };
  }, [audioUrl]);

  const play = useCallback(async () => {
    if (!audioRef.current) return;
    
    try {
      console.log('Attempting to play audio, readyState:', audioRef.current.readyState);
      
      // Reset current time to 0 when starting playback
      setCurrentTime(0);
      audioRef.current.currentTime = 0;
      console.log('Reset current time to 0 for playback start');
      
      // Ensure audio is fully loaded before playing
      if (audioRef.current.readyState < 3) {
        console.log('Audio not fully loaded, waiting...');
        setIsLoading(true);
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Audio loading timeout'));
          }, 10000); // 10 second timeout
          
          const handleCanPlayThrough = () => {
            clearTimeout(timeout);
            audioRef.current.removeEventListener('canplaythrough', handleCanPlayThrough);
            audioRef.current.removeEventListener('error', handleError);
            console.log('Audio fully loaded, readyState:', audioRef.current.readyState);
            resolve();
          };
          
          const handleError = () => {
            clearTimeout(timeout);
            audioRef.current.removeEventListener('canplaythrough', handleCanPlayThrough);
            audioRef.current.removeEventListener('error', handleError);
            reject(new Error('Audio loading error'));
          };
          
          audioRef.current.addEventListener('canplaythrough', handleCanPlayThrough);
          audioRef.current.addEventListener('error', handleError);
        });
      }
      
      await audioRef.current.play();
      setIsPlaying(true);
      setError(null);
      setIsLoading(false);
      console.log('Audio playback started successfully');
    } catch (error) {
      console.error('Error playing audio:', error);
      setError('Failed to play audio');
      setIsPlaying(false);
      setIsLoading(false);
    }
  }, []);

  const pause = useCallback(() => {
    if (!audioRef.current) return;
    
    audioRef.current.pause();
    setIsPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const seek = useCallback((time) => {
    if (!audioRef.current) return;
    
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  }, []);

  const formatTime = useCallback((time) => {
    if (isNaN(time) || time === 0) return '00:00';
    
    console.log('formatTime called with:', time, 'type:', typeof time);
    
    // Ensure time is in seconds
    let timeInSeconds = time;
    
    // If time is very large (likely in milliseconds), convert to seconds
    if (time > 10000) {
      timeInSeconds = time / 1000;
      console.log('Converted from milliseconds:', time, 'to seconds:', timeInSeconds);
    }
    
    // If time is still very large after conversion, it might be in wrong units
    if (timeInSeconds > 3600) { // More than 1 hour, likely wrong
      timeInSeconds = timeInSeconds / 1000;
      console.log('Converted from large value to seconds:', timeInSeconds);
    }
    
    // Ensure we have a reasonable time value
    if (timeInSeconds < 0) timeInSeconds = 0;
    if (timeInSeconds > 3600) timeInSeconds = 0; // Reset if still too large
    
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    
    // Format as MM:SS with leading zeros
    const formatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    console.log('Formatted time:', formatted, 'from seconds:', timeInSeconds);
    
    return formatted;
  }, []);

  return {
    isPlaying,
    duration,
    currentTime,
    isLoading,
    error,
    play,
    pause,
    toggle,
    seek,
    formatTime
  };
};
