// This file centralizes the API and Socket configuration.
// It reads the environment variable provided by Vercel/Render.
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export const API_URL = `${API_BASE_URL}/api`;
export const SOCKET_URL = API_BASE_URL;
