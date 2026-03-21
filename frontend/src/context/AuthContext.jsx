import axios from "axios";
import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);
const API_BASE_URL = "http://127.0.0.1:5000";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored token on initial load
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (storedToken && storedUser) {
      setUser(JSON.parse(storedUser));
      // Set default header for all future axios requests
      axios.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`;
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        username,
        password,
      });
      const { token, user: userData } = response.data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(userData));

      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      setUser(userData);
      return { success: true };
    } catch (error) {
      const isNetworkError = !error.response;
      return {
        success: false,
        error:
          error.response?.data?.error ||
          (isNetworkError
            ? "Cannot reach backend API on 127.0.0.1:5000. Start Flask server first."
            : "Login failed"),
      };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    delete axios.defaults.headers.common["Authorization"];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
