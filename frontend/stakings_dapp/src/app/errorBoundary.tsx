"use client";

/**
 * WalletErrorBoundary
 * Catches any wallet-related runtime errors (e.g. the fake “Other” wallet)
 * and shows a friendly fallback UI.
 */

import { Component, ReactNode } from "react";

interface Props {
    children: ReactNode;
}
interface State {
    hasError: boolean;
}

export default class WalletErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false };

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: Error) {
        console.warn("[WalletErrorBoundary] Caught error:", error.message);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6">
                    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg text-center">
                        <h2 className="mb-2 text-xl font-bold text-red-600">
                            Wallet Connection Failed
                        </h2>
                        <p className="mb-4 text-gray-600">
                            Something went wrong while connecting your wallet. Please refresh
                            the page and try a different wallet.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="rounded-lg bg-linear-to-r from-purple-600 to-blue-600 px-5 py-2 font-medium text-white transition hover:from-purple-700 hover:to-blue-700"
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}