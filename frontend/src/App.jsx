import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute, RoleProtectedRoute } from './components/ProtectedRoute';
import { Toaster } from './components/ui/sonner';

import LoginPage from './pages/Login';
import SignupPage from './pages/Signup';
import VerifyOTPPage from './pages/VerifyOTP';
import DashboardLayout from './layouts/DashboardLayout';
import PatientDashboard from './pages/patient/PatientDashboard';
import PatientPrescriptions from './pages/patient/PatientPrescriptions';
import PatientTreatments from './pages/patient/PatientTreatments';
import PatientAIAssistant from './pages/patient/PatientAIAssistant';
import PatientSettings from './pages/patient/PatientSettings';
import PatientMyRecord from './pages/patient/PatientMyRecord';
import PatientOnboarding from './pages/patient/PatientOnboarding';
import PatientBilling from './pages/patient/PatientBilling';
import PatientAppointments from './pages/patient/PatientAppointments';
import StaffLayout from './layouts/StaffLayout';
import StaffAppointments from './pages/staff/StaffAppointments';
import StaffAddPatient from './pages/staff/StaffAddPatient';
import StaffPatientRecords from './pages/staff/StaffPatientRecords';
import Queue from './pages/staff/Queue';
import VisitLogs from './pages/staff/VisitLogs';
import PrintReports from './pages/staff/PrintReports';
import StaffSettings from './pages/staff/StaffSettings';
import StaffBilling from './pages/staff/StaffBilling';
import AdminLayout from './layouts/AdminLayout';
import DentistLayout from './layouts/DentistLayout';
import DentistQueue from './pages/dentist/DentistQueue';
import DentistPatientRecords from './pages/dentist/DentistPatientRecords';
import DentistTreatmentLogs from './pages/dentist/DentistTreatmentLogs';
import DentistPrescriptions from './pages/dentist/DentistPrescriptions';

import AdminDashboard from './pages/admin/AdminDashboard';
import ReportsGenerator from './pages/admin/ReportsGenerator';
import SystemAuditLogs from './pages/admin/SystemAuditLogs';
import ManageAccounts from './pages/admin/ManageAccounts';
import AIIntentSettings from './pages/admin/AIIntentSettings';

const queryClient = new QueryClient();

// Placeholder components for other dashboards
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
            <Route path="/verify-otp" element={<VerifyOTPPage />} />
            
            {/* Staff Routes */}
            <Route path="/staff" element={<RoleProtectedRoute allowedRoles={["receptionist"]}><StaffLayout /></RoleProtectedRoute>}>
              <Route index element={<Navigate to="/staff/queue" replace />} />
              <Route path="appointments" element={<StaffAppointments />} />
              <Route path="add-patient" element={<StaffAddPatient />} />
              <Route path="patients" element={<StaffPatientRecords />} />
              <Route path="queue" element={<Queue />} />
              <Route path="billing" element={<StaffBilling />} />
              <Route path="visit-logs" element={<VisitLogs />} />
              <Route path="print-reports" element={<PrintReports />} />
              <Route path="settings" element={<StaffSettings />} />
            </Route>

            {/* Dentist Routes */}
            <Route path="/dentist" element={<RoleProtectedRoute allowedRoles={["dentist"]}><DentistLayout /></RoleProtectedRoute>}>
              <Route index element={<Navigate to="/dentist/queue" replace />} />
              <Route path="queue" element={<DentistQueue />} />
              <Route path="records" element={<DentistPatientRecords />} />
              <Route path="treatments" element={<DentistTreatmentLogs />} />
              <Route path="prescriptions" element={<DentistPrescriptions />} />
              <Route path="settings" element={<div className="p-8 text-center"><h2 className="text-2xl font-bold">Settings (Coming Soon)</h2></div>} />
            </Route>

            <Route path="/patient/onboarding" element={<RoleProtectedRoute allowedRoles={["patient"]}><PatientOnboarding /></RoleProtectedRoute>} />

            {/* Dashboard Routes wrapped in the Layout */}
            <Route element={<RoleProtectedRoute allowedRoles={["patient"]}><DashboardLayout /></RoleProtectedRoute>}>
              <Route path="/patient/dashboard" element={<PatientDashboard />} />
              <Route path="/patient/prescriptions" element={<PatientPrescriptions />} />
              <Route path="/patient/treatments" element={<PatientTreatments />} />
              <Route path="/patient/appointments" element={<PatientAppointments />} />
              <Route path="/patient/ai-assistant" element={<PatientAIAssistant />} />
              <Route path="/patient/my-record" element={<PatientMyRecord />} />
              <Route path="/patient/billing" element={<PatientBilling />} />
              <Route path="/patient/settings" element={<PatientSettings />} />
            </Route>

            {/* Admin Portal Routes wrapped in the Admin Layout */}
            <Route element={<RoleProtectedRoute allowedRoles={["admin"]}><AdminLayout /></RoleProtectedRoute>}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/reports" element={<ReportsGenerator />} />
              <Route path="/admin/audit-logs" element={<SystemAuditLogs />} />
              <Route path="/admin/accounts" element={<ManageAccounts />} />
              <Route path="/admin/ai-settings" element={<AIIntentSettings />} />
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
