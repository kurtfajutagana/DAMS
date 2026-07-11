import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if we have a mock admin logged in
    const isMockAdmin = localStorage.getItem("dams_mock_admin") === "true";
    if (isMockAdmin) {
      const mockAdminUser = {
        id: "mock-admin-uuid-1111-2222-3333-444444444444",
        email: "admin@teethtalk.com",
        user_metadata: { full_name: "Admin User" },
        role: "admin"
      };
      setUser(mockAdminUser);
      setSession({ user: mockAdminUser });
      setLoading(false);
      
      // Still set up supabase listener in case they sign out/in elsewhere
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!session) {
          localStorage.removeItem("dams_mock_admin");
          setUser(null);
          setSession(null);
        }
      });
      return () => subscription.unsubscribe();
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    if (email === "staff@teethtalk.com" && password === "password123") {
      const mockUser = {
        id: "mock-staff-id",
        email: "staff@teethtalk.com",
        user_metadata: {
          full_name: "TeethTalk Staff",
          role: "staff"
        }
      };
      const mockSession = { user: mockUser };
      setSession(mockSession);
      setUser(mockUser);
      return { data: { user: mockUser, session: mockSession }, error: null };
    }
    return supabase.auth.signInWithPassword({ email, password });
  };

  const signup = async (email, password, metadata = {}) => {
    return supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata, // allows us to pass additional profile info
      }
    });
  };

  const logout = async () => {
    localStorage.removeItem("dams_mock_admin");
    setUser(null);
    setSession(null);
    return supabase.auth.signOut();
  };

  const value = {
    session,
    user,
    login,
    signup,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};

