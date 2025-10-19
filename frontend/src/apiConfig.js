// This file centralizes the API and Socket configuration.
// It reads the environment variable provided by Vercel/Render.

// Function to clean up potential redirect URLs, e.g., from email clients
const cleanUrl = (url) => {
  if (!url) return '';
  try {
    // Handle cases like Google redirect URLs (`google.com/url?q=...`)
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('google.com') && urlObj.searchParams.has('q')) {
      return urlObj.searchParams.get('q');
    }
  } catch (e) {
    // If parsing fails, it's likely not a complex URL, so return as is.
    return url;
  }
  return url;
};

const rawApiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const API_BASE_URL = cleanUrl(rawApiBaseUrl);

export const API_URL = `${API_BASE_URL}/api`;
export const SOCKET_URL = API_BASE_URL;
