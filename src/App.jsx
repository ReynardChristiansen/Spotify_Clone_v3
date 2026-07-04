import { useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import AppLayout from './components/layout/AppLayout';

export default function App() {
  const { user } = useAuth();
  return user ? <AppLayout /> : <AuthPage />;
}
