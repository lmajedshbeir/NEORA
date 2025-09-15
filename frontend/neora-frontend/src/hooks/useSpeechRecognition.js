import { useState, useRef, useCallback } from 'react';

export const useVoiceRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [error, setError] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const isSupported = 'MediaRecorder' in window && 'getUserMedia' in navigator;

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setError('Voice recording is not supported in this browser');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,  // Higher sample rate for better quality
          channelCount: 1,    // Mono for voice
          volume: 1.0
        } 
      });
      
      // Force a more compatible audio format for better playback
      let mimeType = 'audio/webm;codecs=opus';
      let blobType = 'audio/webm;codecs=opus';
      
      // Check what formats are actually supported
      console.log('Supported formats:', {
        'audio/mp4': MediaRecorder.isTypeSupported('audio/mp4'),
        'audio/wav': MediaRecorder.isTypeSupported('audio/wav'),
        'audio/ogg': MediaRecorder.isTypeSupported('audio/ogg'),
        'audio/ogg; codecs=opus': MediaRecorder.isTypeSupported('audio/ogg; codecs=opus'),
        'audio/webm': MediaRecorder.isTypeSupported('audio/webm'),
        'audio/webm;codecs=opus': MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      });
      
      // Prioritize WebM for better browser audio playback compatibility
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
        blobType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
        blobType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
        blobType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/wav')) {
        mimeType = 'audio/wav';
        blobType = 'audio/wav';
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        mimeType = 'audio/ogg';
        blobType = 'audio/ogg';
      } else if (MediaRecorder.isTypeSupported('audio/ogg; codecs=opus')) {
        mimeType = 'audio/ogg; codecs=opus';
        blobType = 'audio/ogg; codecs=opus';
      }

      console.log('Using audio format:', mimeType);
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: blobType 
        });
        console.log('Created audio blob:', {
          type: blobType,
          size: audioBlob.size,
          chunks: audioChunksRef.current.length
        });
        setAudioBlob(audioBlob);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.onerror = (event) => {
        setError(`Recording error: ${event.error}`);
        setIsRecording(false);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError(null);
    } catch (err) {
      setError('Failed to start recording. Please check microphone permissions.');
      setIsRecording(false);
    }
  }, [isSupported]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const resetRecording = useCallback(() => {
    setAudioBlob(null);
    setError(null);
    audioChunksRef.current = [];
  }, []);

  return {
    isSupported,
    isRecording,
    audioBlob,
    error,
    startRecording,
    stopRecording,
    resetRecording
  };
};

