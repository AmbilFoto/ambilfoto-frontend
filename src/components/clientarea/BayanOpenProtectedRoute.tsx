import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useBayanOpenAuth } from '@/contexts/BayanOpenAuthContext';
import { Loader2 } from 'lucide-react';

export function BayanOpenProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isCheckingAuth } = useBayanOpenAuth();
  const location = useLocation();

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/clientarea/bayan-open/login?redirect=${redirect}`} replace />;
  }

  return <>{children}</>;
}
