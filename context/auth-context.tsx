"use client";
import React, { createContext, useContext, useState, ReactNode } from "react";

interface User {
  id: string;
  email: string;
  name: string;
  role: "Admin" | "Editor" | "Viewer";
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>({
    id: "1",
    email: "user@example.com",
    name: "John Doe",
    role: "Admin",
  });

  const login = async (email: string, password: string) => {
    // Simulate login
    setUser({
      id: "1",
      email,
      name: "John Doe",
      role: "Admin",
    });
  };

  const signup = async (email: string, password: string, name: string) => {
    // Simulate signup
    setUser({
      id: "1",
      email,
      name,
      role: "Admin",
    });
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        signup,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
