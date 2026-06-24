import * as React from "react";
import { Button } from "@/components/ui/button";

type Props = {
  children: React.ReactNode;
  onBack?: () => void;
};

type State = { hasError: boolean; message?: string };

export class ChatErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ChatErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center text-muted-foreground">
          <p className="font-medium text-foreground">โหลดแชทไม่สำเร็จ</p>
          {this.state.message && (
            <p className="text-xs text-muted-foreground max-w-sm break-words">{this.state.message}</p>
          )}
          {this.props.onBack && (
            <Button type="button" variant="outline" className="rounded-full" onClick={this.props.onBack}>
              กลับรายการแชท
            </Button>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
