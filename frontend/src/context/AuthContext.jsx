import { createContext, useContext, useState, useEffect } from "react";
import { loginAdmin } from "../lib/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    const email = localStorage.getItem("admin_email");
    if (token && email) setUser({ email });
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const data = await loginAdmin(email, password);
    localStorage.setItem("admin_token", data.access_token);
    localStorage.setItem("admin_email", data.email);
    setUser({ email: data.email });
    return data;
  };

  const logout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_email");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
