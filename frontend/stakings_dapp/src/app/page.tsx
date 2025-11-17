// src/app/page.tsx
"use client";
import React, { useState, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import ConnectWalletButton from "./components/ConnectWalletButton";
import StakeForm from "./components/StakeForm";
import UnstakeForm from "./components/UnstakeForm";
import ClaimRewards from "./components/ClaimRewards";
import VaultInfo from "./components/VaultInfo";
import { useAnchorProgram } from "./lib/anchor";

function DashboardContent() {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const { program, isReady: programReady } = useAnchorProgram();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!publicKey) return;

    let isCancelled = false;

    const fetchBalance = async () => {
      try {
        const bal = await connection.getBalance(publicKey);
        if (!isCancelled) {
          setBalance(bal / LAMPORTS_PER_SOL);
        }
      } catch (err) {
        console.error("Failed to fetch balance:", err);
        if (!isCancelled) {
          setBalance(null);
        }
      }
    };

    fetchBalance();

    return () => {
      isCancelled = true;
    };
  }, [publicKey, connection]);

  // DEBUG BOX — FIXED: program?.idl.name
  const debugBox = (
    <div
      style={{
        position: "fixed",
        top: 10,
        right: 10,
        background: "#000",
        color: "#0f0",
        padding: "12px",
        borderRadius: "8px",
        font: "12px monospace",
        zIndex: 9999,
        border: "1px solid #0f0",
        minWidth: "200px",
      }}
    >
      <div>UI Connected: {connected ? "YES" : "NO"}</div>
      <div>Public Key: {publicKey ? publicKey.toBase58().slice(0, 8) + "..." : "null"}</div>
      <div>Program Ready: {programReady ? "YES" : "NO"}</div>
      <div>Program Name: {program?.idl.name || "null"}</div>
    </div>
  );

  return (
    <>
      {debugBox}

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <header className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 shadow-2xl relative z-50">
              <div>
                <h1 className="text-4xl font-bold text-white">Staking Protocol</h1>
                <p className="text-sm text-purple-200 mt-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  Devnet • Powered by Solana
                </p>
              </div>
              <ConnectWalletButton />
            </header>

            {/* Stats */}
            {publicKey && balance !== null && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-6 bg-white/10 backdrop-blur-lg rounded-xl border border-white/20">
                  <p className="text-purple-200 text-sm mb-2">Wallet Balance</p>
                  <p className="text-3xl font-bold text-white">{balance.toFixed(4)} SOL</p>
                </div>
                <div className="p-6 bg-white/10 backdrop-blur-lg rounded-xl border border-white/20">
                  <p className="text-purple-200 text-sm mb-2">Network</p>
                  <p className="text-3xl font-bold text-white">Devnet</p>
                </div>
                <div className="p-6 bg-white/10 backdrop-blur-lg rounded-xl border border-white/20">
                  <p className="text-purple-200 text-sm mb-2">Status</p>
                  <p className="text-3xl font-bold text-green-400">Active</p>
                </div>
              </div>
            )}

            {/* Main Content */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-1">
                  <StakeForm />
                </div>
                <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-1">
                  <UnstakeForm />
                </div>
              </div>
              <div className="space-y-6">
                <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-1">
                  <ClaimRewards />
                </div>
                <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-1">
                  <VaultInfo />
                </div>
              </div>
            </section>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-white/10 backdrop-blur-lg rounded-xl border border-white/20">
                <h3 className="text-lg font-semibold text-white mb-2">How to Stake</h3>
                <p className="text-purple-200 text-sm">
                  Enter the amount you want to stake and confirm the transaction in your wallet.
                </p>
              </div>
              <div className="p-6 bg-white/10 backdrop-blur-lg rounded-xl border border-white/20">
                <h3 className="text-lg font-semibold text-white mb-2">Earn Rewards</h3>
                <p className="text-purple-200 text-sm">
                  Your staked tokens automatically earn rewards over time. Claim them anytime!
                </p>
              </div>
              <div className="p-6 bg-white/10 backdrop-blur-lg rounded-xl border border-white/20">
                <h3 className="text-lg font-semibold text-white mb-2">Unstake Anytime</h3>
                <p className="text-purple-200 text-sm">
                  You can unstake your tokens at any time. No lock-up period required.
                </p>
              </div>
            </div>

            {/* Footer */}
            <footer className="text-center text-purple-300 text-sm mt-12 pb-8">
              <p className="mb-2">Built with Solana using Anchor Framework</p>
              <div className="flex items-center justify-center gap-4">
                <a href="https://explorer.solana.com/?cluster=devnet" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-200 transition-colors">
                  Solana Explorer
                </a>
                <span className="text-purple-500">•</span>
                <a href="https://docs.solana.com" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-200 transition-colors">
                  Documentation
                </a>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </>
  );
}

export default function Page() {
  return <DashboardContent />;
}