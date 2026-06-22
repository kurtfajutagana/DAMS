import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

// Placeholder components for routes
const Login = () => <div className="flex h-screen items-center justify-center"><h1 className="text-2xl font-bold">Login / Landing Page</h1></div>;
const PatientDashboard = () => <div className="p-8"><h1 className="text-2xl font-bold">Patient Dashboard</h1></div>;
const DentistDashboard = () => <div className="p-8"><h1 className="text-2xl font-bold">Dentist Dashboard</h1></div>;
const AssistantDashboard = () => <div className="p-8"><h1 className="text-2xl font-bold">Assistant Dashboard</h1></div>;
const NotFound = () => <div className="flex h-screen items-center justify-center"><h1 className="text-2xl font-bold">404 - Not Found</h1></div>;

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/patient/dashboard" element={<PatientDashboard />} />
          <Route path="/dentist/dashboard" element={<DentistDashboard />} />
          <Route path="/assistant/dashboard" element={<AssistantDashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
