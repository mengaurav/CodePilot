import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full glass-card p-6 text-center space-y-4 shadow-xl border border-destructive/30">
            <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Something went wrong</h2>
            <p className="text-xs text-muted-foreground font-mono bg-muted p-3 rounded-lg overflow-auto max-h-32 text-left">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reload Page
              </Button>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => (window.location.href = '/')}
              >
                <Home className="w-3.5 h-3.5" /> Back Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
