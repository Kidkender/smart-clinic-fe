import { Navigate, Route, Routes } from 'react-router-dom';
import AdminLayout from './components/AdminLayout';
import PortalLayout from './components/PortalLayout';
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
import PharmacyWardIssues from './pages/PharmacyWardIssues';
import PharmacyWorklist from './pages/PharmacyWorklist';
import PharmacyPrescriptionDetail from './pages/PharmacyPrescriptionDetail';
import Departments from './pages/Departments';
import LabTests from './pages/LabTests';
import LabWorklist from './pages/LabWorklist';
import ImagingProcedures from './pages/ImagingProcedures';
import ImagingWorklist from './pages/ImagingWorklist';
import DoctorSchedules from './pages/DoctorSchedules';
import Doctors from './pages/Doctors';
import DoctorDetail from './pages/DoctorDetail';
import Users from './pages/Users';
import Profile from './pages/Profile';
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
        <Route path="profile" element={<Profile />} />
        <Route path="patients" element={<Patients />} />
        <Route path="patients/:id" element={<PatientDetail />} />
        <Route path="appointments" element={<Appointments />} />
        <Route path="queue" element={<Queue />} />
        <Route
          path="encounters/:id"
          element={
            <RequireAuth roles={['admin', 'doctor', 'nurse', 'pharmacist']}>
              <Consultation />
            </RequireAuth>
          }
        />
        <Route
          path="admissions"
          element={
            <RequireAuth roles={['admin', 'doctor', 'nurse', 'receptionist']}>
              <Admissions />
            </RequireAuth>
          }
        />
        <Route
          path="admissions/:id"
          element={
            <RequireAuth roles={['admin', 'doctor', 'nurse', 'receptionist']}>
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
          path="pharmacy/ward-issues"
          element={
            <RequireAuth roles={['admin', 'pharmacist']}>
              <PharmacyWardIssues />
            </RequireAuth>
          }
        />
        <Route
          path="pharmacy/worklist"
          element={
            <RequireAuth roles={['admin', 'pharmacist']}>
              <PharmacyWorklist />
            </RequireAuth>
          }
        />
        <Route
          path="pharmacy/worklist/:encounterId/:prescriptionId"
          element={
            <RequireAuth roles={['admin', 'pharmacist']}>
              <PharmacyPrescriptionDetail />
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
          path="lab-tests"
          element={
            <RequireAuth roles={['admin', 'lab_tech']}>
              <LabTests />
            </RequireAuth>
          }
        />
        <Route
          path="lab-worklist"
          element={
            <RequireAuth roles={['admin', 'lab_tech', 'nurse', 'doctor']}>
              <LabWorklist />
            </RequireAuth>
          }
        />
        <Route
          path="imaging-procedures"
          element={
            <RequireAuth roles={['admin', 'radiology_tech']}>
              <ImagingProcedures />
            </RequireAuth>
          }
        />
        <Route
          path="imaging-worklist"
          element={
            <RequireAuth roles={['admin', 'radiology_tech', 'doctor']}>
              <ImagingWorklist />
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
        <Route
          path="users"
          element={
            <RequireAuth roles={['admin']}>
              <Users />
            </RequireAuth>
          }
        />
      </Route>

      <Route path="/portal" element={<PortalLayout />}>
        <Route path="login" element={<PortalLogin />} />
        <Route path="register" element={<PortalRegister />} />
        <Route
          path="home"
          element={
            <RequirePatientAuth>
              <PortalHome />
            </RequirePatientAuth>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
