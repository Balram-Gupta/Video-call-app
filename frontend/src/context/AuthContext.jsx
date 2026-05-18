import axios from "axios";
import httpStatus from "http-status";
import { createContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export const AuthContext = createContext({});

const client = axios.create({
  baseURL: "https://video-call-app-2mgc.onrender.com/api/auth",
});

// Attach token automatically
client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const AuthProvider = ({ children }) => {
  const [userData, setUserData] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useNavigate();

  // Persist login and check for guest session
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem("token");
      const guestSession = localStorage.getItem("guestSession");
      
      if (token) {
        try {
          // Fetch complete user info from backend
          const response = await client.get("/profile");
          if (response.status === httpStatus.OK) {
            const user = response.data.user;
            if (user && typeof user === 'object' && !Array.isArray(user)) {
              setUserData(user);
              setIsAuthenticated(true);
            } else {
              console.error("Invalid user data format:", user);
              logout();
            }
          } else {
            // Token might be invalid
            logout();
          }
        } catch (error) {
          console.error("Failed to fetch user profile:", error);
          // If token is invalid, clear it
          if (error.response?.status === 401) {
            logout();
          } else {
            // If can't fetch profile but token exists, set minimal user data
            setUserData({ token, username: "User", name: "User" });
            setIsAuthenticated(true);
          }
        }
      } else if (guestSession) {
        // Guest session exists
        const guestData = JSON.parse(guestSession);
        if (guestData && typeof guestData === 'object' && !Array.isArray(guestData)) {
          setUserData(guestData);
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem("guestSession");
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);



  const refreshUser = async () => {
    const token = localStorage.getItem("token");
    const guestSession = localStorage.getItem("guestSession");
    
    if (token) {
      try {
        const response = await client.get("/profile");
        if (response.status === httpStatus.OK) {
          const user = response.data.user;
          if (user && typeof user === 'object' && !Array.isArray(user)) {
            setUserData(user);
            setIsAuthenticated(true);
            return user;
          }
        }
      } catch (error) {
        console.error("Failed to refresh user:", error);
        if (error.response?.status === 401) {
          return null;
        }
      }
    } else if (guestSession) {
      const guestData = JSON.parse(guestSession);
      if (guestData && typeof guestData === 'object' && !Array.isArray(guestData)) {
        setUserData(guestData);
        setIsAuthenticated(true);
        return guestData;
      }
    }
    
    return null;
  };

  // login
  const handleLogin = async (email, password) => {
    try {
      const request = await client.post("/login", {
        email,
        password,
      });

      if (request.status === httpStatus.OK) {
        localStorage.setItem("token", request.data.token);
        localStorage.removeItem("guestSession"); 
        
        const user = request.data.user;
        if (user && typeof user === 'object' && !Array.isArray(user)) {
          setUserData(user);
          setIsAuthenticated(true);
          router("/home");
          return request.data;
        } else {
          throw new Error("Invalid user data received");
        }
      }
    } catch (err) {
      throw err.response?.data || err.message;
    }
  };

  //  Register 
  const handleRegister = async (name, username, email, password) => {
    try {
      const request = await client.post("/register", {
        name,
        username,
        email,
        password,
      });

      if (request.status === httpStatus.OK || request.status === httpStatus.CREATED) {
        
        if (request.data.token) {
          localStorage.setItem("token", request.data.token);
          
          const user = request.data.user;
          if (user && typeof user === 'object' && !Array.isArray(user)) {
            setUserData(user);
            setIsAuthenticated(true);
            router("/home");
          }
        }
        return request.data.message || "Registration successful!";
      }
    } catch (err) {
      throw err.response?.data || err.message;
    }
  };

  // Guest token
  const loginAsGuest = async () => {
    try {

      const guestUser = {
        id: `guest_${Date.now()}`,
        name: `Guest${Math.floor(Math.random() * 10000)}`,
        username: `guest${Math.floor(Math.random() * 10000)}`,
        email: null,
        isGuest: true,
        avatar: null,
        createdAt: new Date().toISOString()
      };
      
      // Store guest session in localStorage
      localStorage.setItem("guestSession", JSON.stringify(guestUser));
      localStorage.removeItem("token"); // Clear any existing token
      
      setUserData(guestUser);
      setIsAuthenticated(true);
      
      return guestUser;
    } catch (error) {
      console.error("Guest login error:", error);
      throw error;
    }
  };

  //  Logout 
  const logout = async () => {
    try {
      
      const token = localStorage.getItem("token");
      if (token) {
        try {
          await client.post("/logout");
        } catch (err) {
          console.error("Logout API error:", err);
        }
      }
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("guestSession");
      setUserData(null);
      setIsAuthenticated(false);
      router("/");
    }
  };

  //  Update user Profile 
  const updateUserProfile = async (userData) => {
    try {
      const response = await client.put("/profile", userData);
      if (response.status === httpStatus.OK) {
        const user = response.data.user;
        if (user && typeof user === 'object' && !Array.isArray(user)) {
          setUserData(user);
        }
        return response.data;
      }
    } catch (err) {
      throw err.response?.data || err.message;
    }
  };

  //  Get user Info
  const getUserProfile = async () => {
    try {
      const response = await client.get("/profile");
      if (response.status === httpStatus.OK) {
        const user = response.data.user;
        if (user && typeof user === 'object' && !Array.isArray(user)) {
          setUserData(user);
          return user;
        }
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
      throw err;
    }
  };

  //  History 
const getHistoryOfUser = async () => {
  try {
    if (!userData || userData.isGuest) {
      return [];
    }
    
    const response = await client.get("/get_all_activity");
    
    if (response.data) {
      if (response.data.history) {
        return response.data;
      }
      if (Array.isArray(response.data)) {
        return { history: response.data };
      }
      return response.data;
    }
    
    return { history: [] };
  } catch (error) {
    console.error("Error fetching history:", error);
    return { history: [] };
  }
};

  const addToUserHistory = async (meetingCode) => {
    try {
      if (!userData || userData.isGuest) {
        console.log("Guest users don't have history saved");
        return { message: "History not saved for guest users" };
      }
      
      const request = await client.post("/add_to_activity", {
        meeting_code: meetingCode,
      });

      return request.data;
    } catch (err) {
      console.error("Error adding to history:", err);
      throw err.response?.data || err.message;
    }
  };

  //  Auth status
  const checkAuthStatus = async () => {
    const token = localStorage.getItem("token");
    const guestSession = localStorage.getItem("guestSession");
    
    if (token) {
      try {
        const response = await client.get("/verify");
        return response.data.valid;
      } catch {
        return false;
      }
    } else if (guestSession) {
      return true;
    }
    
    return false;
  };

  
  const getUsername = () => {
    if (!userData) return null;
    if (userData.username && typeof userData.username === 'string' && userData.username !== 'users') {
      return userData.username;
    }
    if (userData.name && typeof userData.name === 'string' && userData.name !== 'users') {
      return userData.name;
    }
    if (userData.email) {
      return userData.email.split('@')[0];
    }
    return null;
  };

  const data = {
    user: userData, 
    userData,
    isAuthenticated,
    loading,
    handleRegister,
    handleLogin,
    loginAsGuest,
    logout,
    updateUserProfile,
    getUserProfile,
    getHistoryOfUser,
    addToUserHistory,
    checkAuthStatus,
    refreshUser, 
    getUsername, 
    setUserData,
  };

  return (
    <AuthContext.Provider value={data}>
      {children}
    </AuthContext.Provider>
  );
};