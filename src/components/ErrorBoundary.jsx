import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-10 bg-red-50 text-red-900 h-full flex flex-col items-center justify-center font-mono text-sm">
                    <h2 className="text-xl font-bold mb-4">Something went wrong.</h2>
                    <p className="mb-2 font-bold">{this.state.error && this.state.error.toString()}</p>
                    <details className="bg-white p-4 rounded shadow-lg overflow-auto max-w-2xl w-full max-h-96 whitespace-pre-wrap">
                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </details>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-6 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                    >
                        Reload Application
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
