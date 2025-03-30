import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for logging
api.interceptors.response.use(
  response => {
    console.log(`API response [${response.config.url}]:`, response.data);
    return response;
  },
  error => {
    console.error(`API error [${error.config?.url}]:`, error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Video-related API calls
export const getVideos = async (params = {}) => {
  console.log('getVideos called with params:', params);
  try {
    // Remove date filters if they're not explicitly set
    const queryParams = { ...params };
    const response = await api.get('/videos', { params: queryParams });
    
    // Handle the new response format
    if (response.data.videos && response.data.total !== undefined) {
      // New format with videos array and total count
      return response.data;
    } else {
      // For backwards compatibility, return the data as-is
      return response.data;
    }
  } catch (error) {
    console.error('Error in getVideos:', error);
    throw error;
  }
};

export const fetchVideosByTimeframe = async (timeframe) => {
  console.log('fetchVideosByTimeframe called with:', timeframe);
  try {
    const response = await api.post('/videos/fetch', timeframe);
    return response.data;
  } catch (error) {
    console.error('Error in fetchVideosByTimeframe:', error);
    throw error;
  }
};

export const getVideo = async (videoId) => {
  try {
    const response = await api.get(`/videos/${videoId}`);
    return response.data;
  } catch (error) {
    console.error(`Error in getVideo(${videoId}):`, error);
    throw error;
  }
};

export const downloadVideo = async (downloadRequest) => {
  try {
    const response = await api.post('/videos/download', downloadRequest);
    return response.data;
  } catch (error) {
    console.error('Error in downloadVideo:', error);
    throw error;
  }
};

export const downloadVideoByUrl = async (url, resolution = '720p') => {
  try {
    const response = await api.post('/videos/download-by-url', { url, resolution });
    return response.data;
  } catch (error) {
    console.error('Error in downloadVideoByUrl:', error);
    throw error;
  }
};

export const getDownloadProgress = async (videoId) => {
  try {
    const response = await api.get(`/videos/${videoId}/progress`);
    return response.data;
  } catch (error) {
    console.error(`Error in getDownloadProgress(${videoId}):`, error);
    throw error;
  }
};

export const deleteVideo = async (videoId) => {
  try {
    const response = await api.delete(`/videos/${videoId}`);
    return response.data;
  } catch (error) {
    console.error(`Error in deleteVideo(${videoId}):`, error);
    throw error;
  }
};

// Channel-related API calls
export const getChannels = async () => {
  try {
    const response = await api.get('/channels');
    return response.data;
  } catch (error) {
    console.error('Error in getChannels:', error);
    throw error;
  }
};

export const addChannel = async (channel) => {
  try {
    const response = await api.post('/channels', channel);
    return response.data;
  } catch (error) {
    console.error('Error in addChannel:', error);
    throw error;
  }
};

export const getChannel = async (channelId) => {
  try {
    const response = await api.get(`/channels/${channelId}`);
    return response.data;
  } catch (error) {
    console.error(`Error in getChannel(${channelId}):`, error);
    throw error;
  }
};

export const deleteChannel = async (channelId) => {
  try {
    const response = await api.delete(`/channels/${channelId}`);
    return response.data;
  } catch (error) {
    console.error(`Error in deleteChannel(${channelId}):`, error);
    throw error;
  }
};

export const getYouTubeSubscriptions = async (options = {}) => {
  try {
    // Default to fast extraction with auth check skipped for speed
    const params = {
      skip_auth_check: true,
      fast: true,
      ...options
    };
    
    console.log('Fetching YouTube subscriptions with params:', params);
    const response = await api.get('/youtube/subscriptions', { params });
    return response.data;
  } catch (error) {
    console.error('Error in getYouTubeSubscriptions:', error);
    throw error;
  }
};

export const extractBrowserCookies = async (browserData) => {
  try {
    const response = await api.post('/auth/cookies/browser', browserData);
    return response.data;
  } catch (error) {
    console.error('Error extracting browser cookies:', error);
    throw error;
  }
};

// Settings-related API calls
export const getSettings = async () => {
  try {
    const response = await api.get('/settings');
    return response.data;
  } catch (error) {
    console.error('Error in getSettings:', error);
    throw error;
  }
};

export const updateSettings = async (settings) => {
  try {
    const response = await api.put('/settings', settings);
    return response.data;
  } catch (error) {
    console.error('Error in updateSettings:', error);
    throw error;
  }
};

// Authentication-related API calls
export const getAuthStatus = async () => {
  try {
    const response = await api.get('/auth/status');
    return response.data;
  } catch (error) {
    console.error('Error in getAuthStatus:', error);
    throw error;
  }
};

export const uploadCookies = async (file) => {
  try {
    // Create FormData object to send the file
    const formData = new FormData();
    formData.append('file', file);
    
    // Use a different content type for file uploads
    const response = await axios.post(`${API_BASE_URL}/auth/cookies`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  } catch (error) {
    console.error('Error in uploadCookies:', error);
    throw error;
  }
}; 