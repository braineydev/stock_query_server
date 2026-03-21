import axios from "axios";

const API_BASE_URL = "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to requests if available
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  },
);

// Handle response errors
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

// API methods
export const authAPI = {
  login: credentials => api.post("/auth/login", credentials),
  logout: () => api.post("/auth/logout"),
};

export const messagesAPI = {
  getAll: () => api.get("/messages"),
  create: message => api.post("/messages", message),
  getById: id => api.get(`/messages/${id}`),
};

export const alertsAPI = {
  getAll: () => api.get("/alerts"),
  acknowledge: id => api.put(`/alerts/${id}/acknowledge`),
  resolve: id => api.put(`/alerts/${id}/resolve`),
};

export const analyticsAPI = {
  getStats: () => api.get("/analytics/stats"),
  getMetrics: () => api.get("/analytics/metrics"),
};

export default api;
