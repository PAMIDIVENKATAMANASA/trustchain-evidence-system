// API base URL - uses environment variable in production, empty string for dev (proxied via Vite)
const API_URL = import.meta.env.VITE_API_URL || '';

export default API_URL;
