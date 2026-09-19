import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { apiRequest } from "../api/client";


type User = {
  id: string;
  phone: string;
  email: string | null;
  phone_verified: boolean;
  email_verified: boolean;
  account_type: string;
  status: string;
  is_admin?: boolean;
};


type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (
    phone: string,
    password: string,
  ) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};


const AuthContext =
  createContext<AuthContextType | undefined>(
    undefined,
  );


export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] =
    useState<User | null>(null);

  const [loading, setLoading] =
    useState(true);


  async function refreshUser() {
    const token =
      localStorage.getItem("access_token");

    if (!token) {
      setUser(null);
      return;
    }

    try {
      const currentUser =
        await apiRequest<User>(
          "/auth/me",
          {
            authenticated: true,
          },
        );

      setUser(currentUser);
    } catch {
      localStorage.removeItem(
        "access_token",
      );

      setUser(null);
    }
  }


  async function login(
    phone: string,
    password: string,
  ) {
    const result =
      await apiRequest<{
        user: User;
        access_token: string;
        token_type: string;
      }>(
        "/auth/login",
        {
          method: "POST",

          body: JSON.stringify({
            phone,
            password,
          }),
        },
      );

    localStorage.setItem(
      "access_token",
      result.access_token,
    );

    setUser(result.user);
  }


  function logout() {
    localStorage.removeItem(
      "access_token",
    );

    setUser(null);
  }


  useEffect(() => {
    async function initialize() {
      await refreshUser();
      setLoading(false);
    }

    initialize();
  }, []);


  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}


export function useAuth() {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth doit être utilisé dans AuthProvider",
    );
  }

  return context;
}