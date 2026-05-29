import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { api } from '../../lib/api';

type Phase = 'exchanging' | 'success' | 'error';

export function GoogleAdsCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('exchanging');
  const [errorMsg, setErrorMsg] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const code = searchParams.get('code');
    const workspaceId = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      setErrorMsg(
        error === 'access_denied'
          ? 'You denied access to Google Ads. No connection was created.'
          : `Google returned an error: ${error}`,
      );
      setPhase('error');
      return;
    }

    if (!code || !workspaceId) {
      setErrorMsg('Missing OAuth parameters. Please try connecting again.');
      setPhase('error');
      return;
    }

    api.integrations.googleAds
      .callback(workspaceId, code)
      .then(conn => {
        setAccountEmail(conn.google_account_email ?? '');
        setPhase('success');
        // Navigate to integrations after a short delay so user sees success state
        setTimeout(() => navigate('/integrations', { replace: true }), 2200);
      })
      .catch(err => {
        const detail =
          err?.data?.detail ?? err?.message ?? 'Failed to exchange OAuth code. Please try again.';
        setErrorMsg(detail);
        setPhase('error');
      });
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-6">
        {phase === 'exchanging' && (
          <>
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-semibold text-foreground">Connecting Google Ads</h1>
              <p className="text-sm text-muted-foreground">
                Exchanging authorisation code with Google&hellip;
              </p>
            </div>
          </>
        )}

        {phase === 'success' && (
          <>
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-semibold text-foreground">Connected successfully</h1>
              {accountEmail && (
                <p className="text-sm text-muted-foreground">
                  Linked as <span className="font-medium text-foreground">{accountEmail}</span>
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Redirecting you to Integrations&hellip;
              </p>
            </div>
          </>
        )}

        {phase === 'error' && (
          <>
            <div className="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-semibold text-foreground">Connection failed</h1>
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => navigate('/integrations', { replace: true })}>
                Back to Integrations
              </Button>
              <Button onClick={() => navigate('/integrations', { replace: true })}>
                Try again
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
