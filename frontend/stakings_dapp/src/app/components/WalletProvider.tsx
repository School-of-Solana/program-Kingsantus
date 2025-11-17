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

    const endpoint = useMemo(() => {
        const clusterNames = ["devnet", "testnet", "mainnet-beta"];
        if (clusterNames.includes(NETWORK)) {
            return clusterApiUrl(NETWORK as import("@solana/web3.js").Cluster);
        }
        return NETWORK;
    }, []);

    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter(),
            new SolflareWalletAdapter(),
        ],
        []
    );

    const onError = useMemo(
        () => (error: Error) => {
            console.error("Wallet error:", error);

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
                confirmTransactionInitialTimeout: 60000,
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