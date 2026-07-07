import { Capacitor } from '@capacitor/core';

// Retrieve backend API base URL
export const getApiBaseUrl = () => {
  if (Capacitor.isNativePlatform()) {
    // If user has configured a custom physical IP address for testing, use it
    const customUrl = localStorage.getItem('custom_api_base_url');
    if (customUrl) return customUrl;
    
    // Default to Android Emulator host loopback (directs to computer's localhost)
    return 'http://10.0.2.2:5000';
  }
  
  // On web browser, use relative paths to leverage Vite proxy configs
  return '';
};

// Custom fetch wrapper
export const fetchApi = async (endpoint, options = {}) => {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;

  // Build headers
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Auto-inject JWT token if available in localStorage
  const token = localStorage.getItem('token');
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const fetchOptions = {
    ...options,
    headers,
  };

  const response = await fetch(url, fetchOptions);
  return response;
};
