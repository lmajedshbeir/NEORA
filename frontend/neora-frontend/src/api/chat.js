import apiClient from './client';

export const chatAPI = {
  // Get messages with pagination
  getMessages: async (params = {}) => {
    const response = await apiClient.get('/messages/', { params });
    return response.data;
  },

  // Send a new message
  sendMessage: async (text, language = 'en') => {
    const response = await apiClient.post('/messages/', { text, language });
    return response.data;
  },

  // Send a voice message
  sendVoiceMessage: async (audioBlob, language = 'en') => {
    console.log('Sending voice message:', {
      type: audioBlob.type,
      size: audioBlob.size,
      name: audioBlob.name || 'voice_message.webm'
    });
    
    // Convert Blob to File object for proper binary upload
    // Use appropriate file extension based on the actual content type
    const getFileExtension = (mimeType) => {
      if (mimeType.includes('mp4')) return 'mp4';
      if (mimeType.includes('wav')) return 'wav';
      if (mimeType.includes('ogg')) return 'ogg';
      return 'webm'; // fallback
    };
    
    const fileExtension = getFileExtension(audioBlob.type);
    const audioFile = new File([audioBlob], `voice_message.${fileExtension}`, {
      type: audioBlob.type || 'audio/webm;codecs=opus',
      lastModified: Date.now()
    });
    
    console.log('Converted to File:', {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size,
      lastModified: audioFile.lastModified
    });
    
    const formData = new FormData();
    formData.append('audio_file', audioFile);
    formData.append('language', language);
    
    // Debug: Log FormData contents
    console.log('FormData entries:');
    for (let [key, value] of formData.entries()) {
      console.log(`${key}:`, value, typeof value);
    }
    
    const response = await apiClient.post('/voice/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  clearMessages: async () => {
    const response = await apiClient.delete('/messages/clear/');
    return response.data;
  },

  // Upload voice file (fallback when Web Speech API is not available)
  uploadVoice: async (audioFile, language = 'en') => {
    const formData = new FormData();
    formData.append('audio_file', audioFile);
    formData.append('language', language);

    const response = await apiClient.post('/voice/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
};

