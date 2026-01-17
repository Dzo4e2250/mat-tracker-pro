import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type AppRole = 'ADMIN' | 'INVENTAR' | 'PRODAJALEC';

interface User {
  id: string;
  email: string;
  fullName: string;
}

interface AuthContextType {
  user: User | null;
  session: any;
  role: AppRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users database
const MOCK_USERS = [
  {
    id: '1',
    email: 'prodajalec@test.si',
    password: 'Test123!',
    fullName: 'Test Prodajalec',
    role: 'PRODAJALEC' as AppRole
  },
  {
    id: '2',
    email: 'inventar@test.si',
    password: 'Test123!',
    fullName: 'Test Inventar',
    role: 'INVENTAR' as AppRole
  },
  {
    id: '3',
    email: 'admin@test.si',
    password: 'Admin123!',
    fullName: 'Test Admin',
    role: 'ADMIN' as AppRole
  }
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in (from localStorage)
    const savedUser = localStorage.getItem('mock_user');
    const savedRole = localStorage.getItem('mock_role');

    if (savedUser && savedRole) {
      setUser(JSON.parse(savedUser));
      setRole(savedRole as AppRole);
    }

    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    // Find user in mock database
    const foundUser = MOCK_USERS.find(
      u => u.email === email && u.password === password
    );

    if (!foundUser) {
      throw new Error('Neveljavni prijavni podatki');
    }

    // Save to localStorage
    const user = {
      id: foundUser.id,
      email: foundUser.email,
      fullName: foundUser.fullName
    };

    localStorage.setItem('mock_user', JSON.stringify(user));
    localStorage.setItem('mock_role', foundUser.role);

    setUser(user);
    setRole(foundUser.role);
  };

  const signOut = async () => {
    localStorage.removeItem('mock_user');
    localStorage.removeItem('mock_role');
    setUser(null);
    setRole(null);
    navigate('/auth');
  };

  return (
    <AuthContext.Provider value={{
      user,
      session: user ? { user } : null,
      role,
      loading,
      signOut,
      signIn
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
