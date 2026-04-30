import { Component, type ErrorInfo, type ReactNode } from "react";
import { RotateCw } from "lucide-react";

import { GlassCard } from "@/shared/ui/GlassCard";
import { PremiumButton } from "@/shared/ui/PremiumButton";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("App error boundary caught an error", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-carbon-950 p-4">
          <GlassCard className="max-w-lg p-8 text-center">
            <p className="text-2xl font-semibold text-white">
              Something went wrong
            </p>
            <p className="mt-3 text-sm leading-6 text-white/58">
              Refresh or go back to dashboard.
            </p>
            <PremiumButton
              className="mt-6"
              icon={RotateCw}
              onClick={() => window.location.reload()}
            >
              Reload
            </PremiumButton>
          </GlassCard>
        </div>
      );
    }

    return this.props.children;
  }
}
