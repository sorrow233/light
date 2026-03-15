import React from 'react';
import { version } from '../../package.json';
import { isChunkLoadError, recoverFromChunkLoadError } from '../utils/chunkLoadRecovery';

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

        const recovered = recoverFromChunkLoadError(error, {
            buildId: version,
            contextName: 'error-boundary',
        });

        if (recovered) {
            return;
        }

        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            const isRecoverableChunkError = isChunkLoadError(this.state.error);

            return (
                <div className="h-full flex flex-col items-center justify-center bg-red-50 px-6 py-10 text-center text-red-900">
                    <h2 className="mb-4 text-xl font-bold">
                        {isRecoverableChunkError ? '应用刚刚更新，页面资源需要刷新' : '页面遇到了一点问题'}
                    </h2>
                    <p className="mb-2 max-w-2xl text-sm font-medium">
                        {isRecoverableChunkError
                            ? '这是部署切换时常见的旧缓存问题。点下面的按钮重新加载一次，通常就会恢复。'
                            : (this.state.error && this.state.error.toString())}
                    </p>
                    <details className="max-h-96 w-full max-w-2xl overflow-auto whitespace-pre-wrap rounded bg-white p-4 text-left font-mono text-sm shadow-lg">
                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </details>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-6 rounded bg-red-600 px-4 py-2 text-white transition hover:bg-red-700"
                    >
                        重新加载应用
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
