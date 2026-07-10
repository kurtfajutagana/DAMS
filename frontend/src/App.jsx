import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Toaster } from './components/ui/sonner';

import LoginPage from './pages/Login';
import SignupPage from './pages/Signup';
import DashboardLayout from './layouts/DashboardLayout';
import PatientDashboard from './pages/PatientDashboard';
import PatientPrescriptions from './pages/PatientPrescriptions';
import PatientTreatments from './pages/PatientTreatments';
import PatientAIAssistant from './pages/PatientAIAssistant';
const queryClient = new QueryClient();

// Placeholder components for other dashboards
const DentistDashboard = () => <div><h1 className="text-2xl font-bold">Dentist Dashboard</h1><p>You are logged in.</p></div>;
const AssistantDashboard = () => <div><h1 className="text-2xl font-bold">Assistant Dashboard</h1><p>You are logged in.</p></div>;
const NotFound = () => <div className="flex h-screen items-center justify-center"><h1 className="text-2xl font-bold">404 - Not Found</h1></div>;

const RootRedirect = () => {
  const location = window.location;
  return <Navigate to={`/login${location.search}${location.hash}`} replace />;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            
            {/* Dashboard Routes wrapped in the Layout */}
            <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route path="/patient/dashboard" element={<PatientDashboard />} />
              <Route path="/patient/prescriptions" element={<PatientPrescriptions />} />
              <Route path="/patient/treatments" element={<PatientTreatments />} />
              <Route path="/patient/ai-assistant" element={<PatientAIAssistant />} />
              <Route path="/dentist/dashboard" element={<DentistDashboard />} />
              <Route path="/assistant/dashboard" element={<AssistantDashboard />} />
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
