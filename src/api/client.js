import axios from "axios";

// API Base URL from Vite environment variable with local fallback
const baseURL =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL) ||
  "http://localhost:5001/api";

const API = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 45000,
});

// Request Interceptor: Automatically attach JWT token (checks localStorage then sessionStorage)
API.interceptors.request.use(
  (config) => {
    const token =
      (typeof localStorage !== "undefined" && localStorage.getItem("token")) ||
      (typeof sessionStorage !== "undefined" && sessionStorage.getItem("token")) ||
      null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle expired/invalid tokens
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const isAuthPage =
        window.location.pathname === "/login" ||
        window.location.pathname === "/register" ||
        window.location.pathname === "/admin/login";

      if (!isAuthPage) {
        localStorage.removeItem("token");
        localStorage.removeItem("userLoggedIn");
        localStorage.removeItem("currentUser");
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("userLoggedIn");
        sessionStorage.removeItem("currentUser");
        // Only redirect if not already on login
        if (window.location.pathname.startsWith("/admin")) {
          localStorage.removeItem("adminLoggedIn");
          window.location.href = "/admin/login";
        } else {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default API;

