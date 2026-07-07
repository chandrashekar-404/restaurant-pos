import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { getApiBaseUrl } from './utils/api'

// Global Fetch Interceptor for Capacitor Mobile compatibility
const originalFetch = window.fetch;
window.fetch = async (url, options = {}) => {
  let finalUrl = url;
  
  // Only intercept relative /api routes
  if (typeof url === 'string' && url.startsWith('/api')) {
    const baseUrl = getApiBaseUrl();
    finalUrl = `${baseUrl}${url}`;
  }
  
  // Automatically inject content-type and authorization headers
  const headers = { ...options.headers };
  
  if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  
  const token = localStorage.getItem('token');
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return originalFetch(finalUrl, {
    ...options,
    headers,
  });
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
