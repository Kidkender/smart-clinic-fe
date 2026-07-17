import { Navigate, Route, Routes } from 'react-router-dom';
import AdminLayout from './components/AdminLayout';
import RequireAuth from './components/RequireAuth';
import RequirePatientAuth from './components/RequirePatientAuth';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import PatientDetail from './pages/PatientDetail';
import Appointments from './pages/Appointments';
import Queue from './pages/Queue';
import Consultation from './pages/Consultation';
import Admissions from './pages/Admissions';
import AdmissionDetail from './pages/AdmissionDetail';
import Wards from './pages/Wards';
import Departments from './pages/Departments';
import DoctorSchedules from './pages/DoctorSchedules';
import Doctors from './pages/Doctors';
import DoctorDetail from './pages/DoctorDetail';
import PortalLogin from './pages/portal/PortalLogin';
import PortalRegister from './pages/portal/PortalRegister';
import PortalHome from './pages/portal/PortalHome';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route
        path="/"
        element={
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="patients" element={<Patients />} />
        <Route path="patients/:id" element={<PatientDetail />} />
        <Route path="appointments" element={<Appointments />} />
        <Route path="queue" element={<Queue />} />
        <Route
          path="encounters/:id"
          element={
            <RequireAuth roles={['admin', 'doctor', 'nurse']}>
              <Consultation />
            </RequireAuth>
          }
        />
        <Route
          path="admissions"
          element={
            <RequireAuth roles={['admin', 'doctor', 'nurse']}>
              <Admissions />
            </RequireAuth>
          }
        />
        <Route
          path="admissions/:id"
          element={
            <RequireAuth roles={['admin', 'doctor', 'nurse']}>
              <AdmissionDetail />
            </RequireAuth>
          }
        />
        <Route
          path="wards"
          element={
            <RequireAuth roles={['admin']}>
              <Wards />
            </RequireAuth>
          }
        />
        <Route
          path="departments"
          element={
            <RequireAuth roles={['admin']}>
              <Departments />
            </RequireAuth>
          }
        />
        <Route
          path="doctor-schedules"
          element={
            <RequireAuth roles={['admin']}>
              <DoctorSchedules />
            </RequireAuth>
          }
        />
        <Route
          path="doctors"
          element={
            <RequireAuth roles={['admin']}>
              <Doctors />
            </RequireAuth>
          }
        />
        <Route
          path="doctors/:id"
          element={
            <RequireAuth roles={['admin']}>
              <DoctorDetail />
            </RequireAuth>
          }
        />
      </Route>

      <Route path="/portal/login" element={<PortalLogin />} />
      <Route path="/portal/register" element={<PortalRegister />} />
      <Route
        path="/portal/home"
        element={
          <RequirePatientAuth>
            <PortalHome />
          </RequirePatientAuth>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
