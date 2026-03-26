import axios from "axios";

const api = axios.create({ baseURL: "http://localhost:5000/api" });

export const predictRisk = (data) => api.post("/predict", data);
export const getRecommendations = (data) => api.post("/recommendations", data);
export const getDailyFeedback = (data) => api.post("/feedback", data);
export const getHealthScore = (data) => api.post("/health-score", data);
export const getAlerts = (data) => api.post("/alerts", data);
