import { Navigate } from 'react-router-dom';
import { usePatientAuth } from '../context/PatientAuthContext';

export default function RequirePatientAuth({ children }) {
  const { isLoggedIn } = usePatientAuth();

  if (!isLoggedIn) {
    return <Navigate to="/portal/login" replace />;
  }
  return children;
}
