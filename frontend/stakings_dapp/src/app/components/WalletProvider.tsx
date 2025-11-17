// src/components/WalletProvider.tsx
"use client";
import React, { ReactNode, useMemo } from "react";
import {
    ConnectionProvider,
    WalletProvider
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
    PhantomWalletAdapter,
    SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";
import { NETWORK } from "../config/program";

import "@solana/wallet-adapter-react-ui/styles.css";

interface SolanaWalletProviderProps {
    children: ReactNode;
    autoConnect?: boolean;
}

export default function SolanaWalletProvider({
    children,
    autoConnect = true
}: SolanaWalletProviderProps) {

    // Better endpoint handling with fallback
    const endpoint = useMemo(() => {
        // Check if NETWORK is a cluster name or a full URL
        const clusterNames = ["devnet", "testnet", "mainnet-beta"];
        if (clusterNames.includes(NETWORK)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return clusterApiUrl(NETWORK as any);
        }
        // Otherwise use the custom RPC URL
        return NETWORK;
    }, []);

    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter(),
            new SolflareWalletAdapter(),
        ],
        []
    );

    // Error handler for wallet errors
    const onError = useMemo(
        () => (error: Error) => {
            console.error("Wallet error:", error);

            // Handle specific error types
            if (error.name === "WalletNotConnectedError") {
                console.log("Please connect your wallet");
            } else if (error.name === "WalletSignTransactionError") {
                console.log("Transaction signing was cancelled");
            } else {
                console.error("An unexpected wallet error occurred");
            }
        },
        []
    );

    return (
        <ConnectionProvider
            endpoint={endpoint}
            config={{
                commitment: "confirmed",
                confirmTransactionInitialTimeout: 60000, // 60 seconds
            }}
        >
            <WalletProvider
                wallets={wallets}
                autoConnect={autoConnect}
                onError={onError}
            >
                <WalletModalProvider>
                    {children}
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
}