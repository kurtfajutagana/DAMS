import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const ProtectedRoute = ({ children }) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profile && profile.is_active === false) {
    // If they have an active session but are disabled, they shouldn't be here.
    return <Navigate to="/login" replace />;
  }

  if (profile && !profile.is_email_verified) {
    return <Navigate to="/verify-otp" state={{ email: user.email, userId: user.id }} replace />;
  }

  return children;
};

export const RoleProtectedRoute = ({ children, allowedRoles }) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profile && profile.is_active === false) {
    return <Navigate to="/login" replace />;
  }

  if (profile && !profile.is_email_verified) {
    return <Navigate to="/verify-otp" state={{ email: user.email, userId: user.id }} replace />;
  }

  if (profile && !allowedRoles.includes(profile.role)) {
    // Redirect to their respective dashboard if they try to access unauthorized routes
    if (profile.role === "patient") return <Navigate to="/patient/dashboard" replace />;
    if (profile.role === "admin") return <Navigate to="/admin/dashboard" replace />;
    if (profile.role === "dentist") return <Navigate to="/dentist/queue" replace />;
    if (profile.role === "receptionist") return <Navigate to="/staff/queue" replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
};
