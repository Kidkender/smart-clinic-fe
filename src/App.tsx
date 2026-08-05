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
import PaymentReturn from './pages/PaymentReturn';
import SurveyResponse from './pages/SurveyResponse';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import PatientDetail from './pages/PatientDetail';
import Appointments from './pages/Appointments';
import Queue from './pages/Queue';
import Consultation from './pages/Consultation';
import Admissions from './pages/Admissions';
import AdmissionDetail from './pages/AdmissionDetail';
import Wards from './pages/Wards';
import OperatingRooms from './pages/OperatingRooms';
import SurgerySchedule from './pages/SurgerySchedule';
import Payers from './pages/Payers';
import FeeSettings from './pages/FeeSettings';
import FinanceReport from './pages/FinanceReport';
import ClinicalReport from './pages/ClinicalReport';
import InventoryReport from './pages/InventoryReport';
import PharmacyDispenseQueue from './pages/PharmacyDispenseQueue';
import PharmacyWardIssues from './pages/PharmacyWardIssues';
import PharmacyWorklist from './pages/PharmacyWorklist';
import PharmacyPrescriptionDetail from './pages/PharmacyPrescriptionDetail';
import Departments from './pages/Departments';
import Rooms from './pages/Rooms';
import Inventory from './pages/Inventory';
import StockTransactions from './pages/StockTransactions';
import StockAudits from './pages/StockAudits';
import StockAuditDetail from './pages/StockAuditDetail';
import MedicalSupplies from './pages/MedicalSupplies';
import SupplyStockTransactions from './pages/SupplyStockTransactions';
import SupplyUsages from './pages/SupplyUsages';
import SupplyStockAudits from './pages/SupplyStockAudits';
import SupplyStockAuditDetail from './pages/SupplyStockAuditDetail';
import LabTests from './pages/LabTests';
import LabWorklist from './pages/LabWorklist';
import ImagingProcedures from './pages/ImagingProcedures';
import ImagingWorklist from './pages/ImagingWorklist';
import DoctorSchedules from './pages/DoctorSchedules';
import Doctors from './pages/Doctors';
import DoctorDetail from './pages/DoctorDetail';
import Employees from './pages/Employees';
import EmployeeDetail from './pages/EmployeeDetail';
import AttendanceSummary from './pages/AttendanceSummary';
import Users from './pages/Users';
import AuditLogs from './pages/AuditLogs';
import Notifications from './pages/Notifications';
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
      <Route path="/payments/:gateway/return" element={<PaymentReturn />} />
      <Route path="/survey/:token" element={<SurveyResponse />} />

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
            <RequireAuth roles={['admin', 'doctor', 'nurse', 'pharmacist', 'cashier', 'receptionist']}>
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
          path="payers"
          element={
            <RequireAuth roles={['admin', 'cashier', 'receptionist']}>
              <Payers />
            </RequireAuth>
          }
        />
        <Route
          path="operating-rooms"
          element={
            <RequireAuth roles={['admin']}>
              <OperatingRooms />
            </RequireAuth>
          }
        />
        <Route
          path="surgeries"
          element={
            <RequireAuth roles={['admin', 'doctor', 'nurse']}>
              <SurgerySchedule />
            </RequireAuth>
          }
        />
        <Route
          path="fee-settings"
          element={
            <RequireAuth roles={['admin']}>
              <FeeSettings />
            </RequireAuth>
          }
        />
        <Route
          path="finance-report"
          element={
            <RequireAuth roles={['admin', 'cashier']}>
              <FinanceReport />
            </RequireAuth>
          }
        />
        <Route
          path="clinical-report"
          element={
            <RequireAuth roles={['admin', 'doctor', 'nurse']}>
              <ClinicalReport />
            </RequireAuth>
          }
        />
        <Route
          path="inventory-report"
          element={
            <RequireAuth roles={['admin', 'pharmacist']}>
              <InventoryReport />
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
          path="pharmacy/dispense-queue"
          element={
            <RequireAuth roles={['admin', 'pharmacist']}>
              <PharmacyDispenseQueue />
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
          path="rooms"
          element={
            <RequireAuth roles={['admin']}>
              <Rooms />
            </RequireAuth>
          }
        />
        <Route
          path="inventory"
          element={
            <RequireAuth roles={['admin', 'pharmacist']}>
              <Inventory />
            </RequireAuth>
          }
        />
        <Route
          path="inventory/transactions"
          element={
            <RequireAuth roles={['admin', 'pharmacist']}>
              <StockTransactions />
            </RequireAuth>
          }
        />
        <Route
          path="inventory/audits"
          element={
            <RequireAuth roles={['admin', 'pharmacist']}>
              <StockAudits />
            </RequireAuth>
          }
        />
        <Route
          path="inventory/audits/:id"
          element={
            <RequireAuth roles={['admin', 'pharmacist']}>
              <StockAuditDetail />
            </RequireAuth>
          }
        />
        <Route
          path="medical-supplies"
          element={
            <RequireAuth roles={['admin', 'pharmacist']}>
              <MedicalSupplies />
            </RequireAuth>
          }
        />
        <Route
          path="medical-supplies/transactions"
          element={
            <RequireAuth roles={['admin', 'pharmacist']}>
              <SupplyStockTransactions />
            </RequireAuth>
          }
        />
        <Route
          path="medical-supplies/usages"
          element={
            <RequireAuth roles={['admin', 'doctor', 'nurse', 'pharmacist']}>
              <SupplyUsages />
            </RequireAuth>
          }
        />
        <Route
          path="medical-supplies/stock-audits"
          element={
            <RequireAuth roles={['admin', 'pharmacist']}>
              <SupplyStockAudits />
            </RequireAuth>
          }
        />
        <Route
          path="medical-supplies/stock-audits/:id"
          element={
            <RequireAuth roles={['admin', 'pharmacist']}>
              <SupplyStockAuditDetail />
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
          path="employees"
          element={
            <RequireAuth roles={['admin']}>
              <Employees />
            </RequireAuth>
          }
        />
        <Route
          path="employees/attendance-summary"
          element={
            <RequireAuth roles={['admin']}>
              <AttendanceSummary />
            </RequireAuth>
          }
        />
        <Route
          path="employees/:id"
          element={
            <RequireAuth roles={['admin']}>
              <EmployeeDetail />
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
        <Route
          path="audit-logs"
          element={
            <RequireAuth roles={['admin']}>
              <AuditLogs />
            </RequireAuth>
          }
        />
        <Route
          path="notifications"
          element={
            <RequireAuth roles={['admin']}>
              <Notifications />
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
