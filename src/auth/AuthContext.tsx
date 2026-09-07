import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  AuthUser, 
  UserRole, 
  LoginCredentials, 
  PatientSignupPayload, 
  DoctorSignupPayload, 
  AuthResult 
} from './authTypes';
import { authService } from './authService';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  role: UserRole | null;
  isPatient: boolean;
  isDoctor: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthResult>;
  signupPatient: (payload: PatientSignupPayload) => Promise<AuthResult>;
  signupDoctor: (payload: DoctorSignupPayload) => Promise<AuthResult>;
  logout: () => void;
  hasRole: (requiredRole: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => authService.getCurrentUser());

  useEffect(() => {
    const active = authService.getCurrentUser();
    setUser(active);
  }, []);

  const login = async (credentials: LoginCredentials): Promise<AuthResult> => {
    const result = await authService.login(credentials);
    if (result.success && result.user) {
      setUser(result.user);
    }
    return result;
  };

  const signupPatient = async (payload: PatientSignupPayload): Promise<AuthResult> => {
    const result = await authService.signupPatient(payload);
    if (result.success && result.user) {
      setUser(result.user);
    }
    return result;
  };

  const signupDoctor = async (payload: DoctorSignupPayload): Promise<AuthResult> => {
    const result = await authService.signupDoctor(payload);
    if (result.success && result.user) {
      setUser(result.user);
    }
    return result;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const hasRole = (requiredRole: UserRole): boolean => {
    return user !== null && user.role === requiredRole;
  };

  const isPatient = user?.role === 'patient';
  const isDoctor = user?.role === 'doctor';
  const isAuthenticated = user !== null;
  const role = user?.role || null;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        role,
        isPatient,
        isDoctor,
        login,
        signupPatient,
        signupDoctor,
        logout,
        hasRole
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
