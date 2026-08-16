import { Component, type ErrorInfo, type PropsWithChildren } from "react";

import { ErrorState } from "@/components/screen-state";
import { createDiagnosticId } from "@/lib/diagnostics";
import { persistSanitizedCrash } from "@/services/telemetry-service";

type State = { error: Error | null; diagnosticId?: string };
export class AppErrorBoundary extends Component<PropsWithChildren, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State {
    return { error, diagnosticId: createDiagnosticId("app") };
  }
  componentDidCatch(_error: Error, _info: ErrorInfo) {
    if (this.state.diagnosticId)
      void persistSanitizedCrash(this.state.diagnosticId).catch(() => undefined);
  }
  render() {
    if (this.state.error)
      return (
        <ErrorState
          title="NEXORA hit an unexpected error"
          message="Restart this view or try again."
          diagnosticId={this.state.diagnosticId}
          actionLabel="Try again"
          onAction={() => this.setState({ error: null, diagnosticId: undefined })}
        />
      );
    return this.props.children;
  }
}
