import React from 'react';
import { useNavigate } from 'react-router';
import { Home, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../../contexts/AuthContext';

// ─── EmptyState ───────────────────────────────────────────────────────────────

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-5">{description}</p>
      {action && (
        <Button onClick={action.onClick} size="sm">
          {action.label}
        </Button>
      )}
    </div>
  );
}

// ─── NotFoundPage ─────────────────────────────────────────────────────────────

export function NotFoundPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        {/* Large gradient 404 */}
        <p
          className="text-[120px] font-black leading-none bg-gradient-to-br from-primary via-accent to-cyan bg-clip-text text-transparent select-none"
          aria-hidden="true"
        >
          404
        </p>

        <h1 className="text-2xl font-bold text-foreground mt-4 mb-2">Page not found</h1>
        <p className="text-muted-foreground mb-8">
          The page you're looking for doesn't exist or has been moved. Double-check the URL or
          head back to somewhere safe.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {isAuthenticated ? (
            <Button onClick={() => navigate('/dashboard')} className="gap-2">
              <Home className="w-4 h-4" />
              Go to Dashboard
            </Button>
          ) : (
            <>
              <Button onClick={() => navigate('/dashboard')} className="gap-2">
                <Home className="w-4 h-4" />
                Go to Dashboard
              </Button>
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Go to Landing
              </button>
            </>
          )}

          {isAuthenticated && (
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Go back
            </button>
          )}
        </div>

        {/* Decorative dots */}
        <div className="mt-16 flex items-center justify-center gap-2" aria-hidden="true">
          <span className="w-2 h-2 rounded-full bg-primary/30" />
          <span className="w-2 h-2 rounded-full bg-accent/30" />
          <span className="w-2 h-2 rounded-full bg-cyan/30" />
        </div>
      </div>
    </div>
  );
}
