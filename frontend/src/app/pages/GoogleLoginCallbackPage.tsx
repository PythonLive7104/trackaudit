import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { ClipboardCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function GoogleLoginCallbackPage() {
  const [searchParams] = useSearchParams();
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');

    if (errorParam || !code) {
      setError(errorParam === 'access_denied' ? 'Google sign-in was cancelled.' : 'Google sign-in failed. Please try again.');
      return;
    }

    const workspaceName = sessionStorage.getItem('ta_google_workspace') ?? undefined;
    sessionStorage.removeItem('ta_google_workspace');

    loginWithGoogle(code, workspaceName)
      .then(({ hasWorkspace, isNew }) => {
        navigate(isNew || !hasWorkspace ? '/onboarding' : '/dashboard', { replace: true });
      })
      .catch(() => {
        setError('Authentication failed. The link may have expired — please try again.');
      });
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4 p-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-2">
          <ClipboardCheck className="w-7 h-7 text-white" />
        </div>
        <p className="text-destructive font-medium">{error}</p>
        <button
          onClick={() => navigate('/login', { replace: true })}
          className="mt-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Back to login
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
        <ClipboardCheck className="w-7 h-7 text-white" />
      </div>
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-muted-foreground">Signing you in…</p>
    </div>
  );
}
