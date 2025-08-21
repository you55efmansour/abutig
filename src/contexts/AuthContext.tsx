import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'EMPLOYEE' | 'ADMIN';
}

interface Complainant {
  id: string;
  fullName: string;
  phone: string;
}

interface AuthContextType {
  user: User | null;
  complainant: Complainant | null;
  userType: 'user' | 'complainant' | null;
  login: (userData: User, token: string) => void;
  loginComplainant: (complainantData: Complainant, token: string) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [complainant, setComplainant] = useState<Complainant | null>(null);
  const [loading, setLoading] = useState(true);

  const userType = user ? 'user' : complainant ? 'complainant' : null;

  useEffect(() => {
    // Check for stored authentication data
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('user');
    const storedComplainant = localStorage.getItem('complainant');
    const storedUserType = localStorage.getItem('userType');

    if (storedToken && storedUserType === 'user' && storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        localStorage.clear();
      }
    } else if (storedToken && storedUserType === 'complainant' && storedComplainant) {
      try {
        const complainantData = JSON.parse(storedComplainant);
        setComplainant(complainantData);
      } catch (error) {
        console.error('Error parsing stored complainant data:', error);
        localStorage.clear();
      }
    }

    setLoading(false);
  }, []);

  const login = (userData: User, token: string) => {
    setUser(userData);
    setComplainant(null);
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('userType', 'user');
    localStorage.removeItem('complainant');
  };

  const loginComplainant = (complainantData: Complainant, token: string) => {
    setComplainant(complainantData);
    setUser(null);
    localStorage.setItem('authToken', token);
    localStorage.setItem('complainant', JSON.stringify(complainantData));
    localStorage.setItem('userType', 'complainant');
    localStorage.removeItem('user');
  };

  const logout = () => {
    setUser(null);
    setComplainant(null);
    localStorage.clear();
  };

  const value: AuthContextType = {
    user,
    complainant,
    userType,
    login,
    loginComplainant,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};