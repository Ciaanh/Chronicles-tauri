import { Component, ErrorInfo, ReactNode } from "react";
import { Button, Result, Typography } from "antd";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <Result
                    status="error"
                    title="Something went wrong"
                    subTitle="An unexpected error occurred. You can try reloading the application."
                    extra={
                        <Button onClick={() => window.location.reload()}>
                            Reload
                        </Button>
                    }
                >
                    {this.state.error && (
                        <Typography.Text type="secondary" code>
                            {this.state.error.message}
                        </Typography.Text>
                    )}
                </Result>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;

