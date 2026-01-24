import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import type { Profile } from '@/integrations/supabase/types';

type AppRole = 'admin' | 'inventar' | 'prodajalec';

const ACTIVE_ROLE_KEY = 'mat_tracker_active_role';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  activeRole: AppRole | null;
  availableRoles: AppRole[];
  loading: boolean;
  needsRoleSelection: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  switchRole: (role: AppRole) => void;
  selectInitialRole: (role: AppRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [activeRole, setActiveRole] = useState<AppRole | null>(null);
  const [availableRoles, setAvailableRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsRoleSelection, setNeedsRoleSelection] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let loadingTimeout: NodeJS.Timeout;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Defer profile fetching with setTimeout - NEVER use async in callback
        if (session?.user) {
          loadingTimeout = setTimeout(() => {
            fetchUserProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        loadingTimeout = setTimeout(() => {
          fetchUserProfile(session.user.id);
        }, 0);
      } else {
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string, checkRoleSelection = false) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        setProfile(data as Profile);
        setRole(data.role as AppRole);

        // Determine available roles
        const roles: AppRole[] = [data.role as AppRole];
        if (data.secondary_role) {
          roles.push(data.secondary_role as AppRole);
        }
        setAvailableRoles(roles);

        // Handle role selection
        if (roles.length > 1) {
          // Check if there's a saved active role
          const savedRole = localStorage.getItem(ACTIVE_ROLE_KEY);
          if (savedRole && roles.includes(savedRole as AppRole)) {
            setActiveRole(savedRole as AppRole);
            setNeedsRoleSelection(false);
          } else if (checkRoleSelection) {
            // User just logged in and has multiple roles - show selection
            setNeedsRoleSelection(true);
            setActiveRole(null);
          } else {
            // Default to primary role
            setActiveRole(data.role as AppRole);
          }
        } else {
          // Single role - no selection needed
          setActiveRole(data.role as AppRole);
          setNeedsRoleSelection(false);
        }
      }
    } catch (error) {
      // Error handled
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data.user) {
      // Check for role selection on fresh login
      await fetchUserProfile(data.user.id, true);
    }
  };

  const signOut = async () => {
    localStorage.removeItem(ACTIVE_ROLE_KEY);
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
    setActiveRole(null);
    setAvailableRoles([]);
    setNeedsRoleSelection(false);
    navigate('/auth');
  };

  const switchRole = (newRole: AppRole) => {
    if (availableRoles.includes(newRole)) {
      localStorage.setItem(ACTIVE_ROLE_KEY, newRole);
      setActiveRole(newRole);
      // Navigate to the appropriate dashboard
      if (newRole === 'inventar' || newRole === 'admin') {
        navigate('/inventar');
      } else if (newRole === 'prodajalec') {
        navigate('/prodajalec');
      }
    }
  };

  const selectInitialRole = (selectedRole: AppRole) => {
    localStorage.setItem(ACTIVE_ROLE_KEY, selectedRole);
    setActiveRole(selectedRole);
    setNeedsRoleSelection(false);
    // Navigate to the appropriate dashboard
    if (selectedRole === 'inventar' || selectedRole === 'admin') {
      navigate('/inventar');
    } else if (selectedRole === 'prodajalec') {
      navigate('/prodajalec');
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      role,
      activeRole,
      availableRoles,
      loading,
      needsRoleSelection,
      signIn,
      signOut,
      switchRole,
      selectInitialRole,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
