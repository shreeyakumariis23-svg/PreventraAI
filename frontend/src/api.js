import axios from "axios";

const api = axios.create({ baseURL: "http://localhost:5001/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("preventra_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const registerUser  = (data) => api.post("/auth/register", data);
export const loginUser     = (data) => api.post("/auth/login", data);

export const predictRisk        = (data) => api.post("/predict", data);
export const getRecommendations = (data) => api.post("/recommendations", data);
export const getDailyFeedback   = (data) => api.post("/feedback", data);
export const getHealthScore     = (data) => api.post("/health-score", data);
export const getAlerts          = (data) => api.post("/alerts", data);
export const askHealthChat      = (data) => api.post("/chat", data);
