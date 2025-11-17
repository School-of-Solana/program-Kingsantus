"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAnchorProgram } from "../lib/anchor";
import { findVaultPda } from "../utils/pda";
import { BN } from "@coral-xyz/anchor";

function formatTokenAmount(amount: BN | number, decimals = 9): string {
    const bn = typeof amount === "number" ? new BN(amount) : amount;
    const divisor = new BN(10).pow(new BN(decimals));
    const whole = bn.div(divisor).toString();
    const fraction = bn.mod(divisor).toString().padStart(decimals, "0");
    return `${whole}.${fraction.slice(0, 4)}`;
}

export default function VaultInfo() {
    const { program, walletPublicKey } = useAnchorProgram();
    type VaultInfoState = {
        address: string;
        data: {
            stakedAmount?: BN;
            rewardDebt?: BN;
            // Add other known vault account fields here
            owner?: string;
            lastUpdate?: BN;
        };
    } | null;
    const [info, setInfo] = useState<VaultInfoState>(null);
    const [err, setErr] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(true);

    const handleLoad = useCallback(async () => {
        if (!program || !walletPublicKey) return;

        setLoading(true);
        setErr(null);

        try {
            const [vaultPda] = findVaultPda(walletPublicKey);

            // THIS IS THE CORRECT LINE — USE CAPITAL "Vault"
            // @ts-expect-ignore - vault account exists in IDL at runtime
            const vaultAcc = await program.account.vault.fetchNullable(vaultPda);

            if (!vaultAcc) {
                setErr("Vault not initialized yet. Stake first to create it.");
                setInfo(null);
                return;
            }

            setInfo({
                address: vaultPda.toBase58(),
                data: vaultAcc,
            });
        } catch (e: unknown) {
            console.error("Vault fetch error:", e);
            setErr("Vault not found. Stake some tokens first!");
            setInfo(null);
        } finally {
            setLoading(false);
        }
    }, [program, walletPublicKey]);

    useEffect(() => {
        if (walletPublicKey && program) {
            handleLoad();
            if (autoRefresh) {
                const id = setInterval(handleLoad, 8000);
                return () => clearInterval(id);
            }
        }
    }, [walletPublicKey, program, autoRefresh, handleLoad]);

    return (
        <div className="p-8 rounded-2xl bg-gradient-to-br from-green-50 via-white to-green-50 border-4 border-green-600 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-green-800">YOUR VAULT</h2>
                <button
                    onClick={handleLoad}
                    className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition"
                >
                    {loading ? "Loading..." : "Refresh"}
                </button>
            </div>

            {err && (
                <div className="p-6 bg-red-100 border-2 border-red-500 rounded-xl text-red-800 font-bold text-center">
                    {err}
                </div>
            )}

            {info && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="p-6 bg-white rounded-xl shadow-lg border-2 border-green-500">
                            <p className="text-gray-600">Staked Amount</p>
                            <p className="text-4xl font-bold text-green-700">
                                {info.data.stakedAmount ? formatTokenAmount(info.data.stakedAmount) : "0"}
                            </p>
                        </div>

                        <div className="p-6 bg-white rounded-xl shadow-lg border-2 border-yellow-500">
                            <p className="text-gray-600">Pending Rewards</p>
                            <p className="text-4xl font-bold text-yellow-600">
                                {info.data.rewardDebt ? formatTokenAmount(info.data.rewardDebt) : "0"}
                            </p>
                        </div>
                    </div>

                    <div className="text-center">
                        <p className="text-sm text-gray-500">Vault PDA</p>
                        <p className="text-xs font-mono break-all text-gray-700">{info.address}</p>
                    </div>
                </div>
            )}

            {!walletPublicKey && (
                <div className="text-center py-16">
                    <p className="text-2xl font-bold text-gray-700">Connect wallet to see your power</p>
                </div>
            )}
        </div>
    );
}