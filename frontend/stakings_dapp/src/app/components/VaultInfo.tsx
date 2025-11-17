// src/components/VaultInfo.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAnchorProgram } from "../lib/anchor";
import { findVaultPda } from "../utils/pda";
import { BN } from "@coral-xyz/anchor";

// Format BN to readable string (e.g., 1000000000 → 1.0000)
function formatTokenAmount(amount: BN | number, decimals = 9): string {
    const bn = typeof amount === "number" ? new BN(amount) : amount;
    const divisor = new BN(10).pow(new BN(decimals));
    const whole = bn.div(divisor).toString();
    const fraction = bn.mod(divisor).toString().padStart(decimals, "0");
    return `${whole}.${fraction.slice(0, 4)}`;
}

export default function VaultInfo() {
    const { program, walletPublicKey } = useAnchorProgram();
    const [info, setInfo] = useState<any>(null);
    const [err, setErr] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(false);

    // Memoize to prevent re-creation on every render
    const handleLoad = useCallback(async () => {
        if (!program || !walletPublicKey) return;

        setLoading(true);
        setErr(null);

        try {
            const [vaultPda] = findVaultPda(walletPublicKey);

            // Use fetchNullable to safely check if vault exists
            const vaultAcc = await program.account.vault.fetchNullable(vaultPda);

            if (!vaultAcc) {
                setErr("Vault not initialized. Stake tokens to create your vault.");
                setInfo(null);
                return;
            }

            setInfo({
                address: vaultPda.toBase58(),
                data: vaultAcc,
            });
        } catch (e: any) {
            console.error("Vault fetch error:", e);

            const msg = e.message || String(e);

            if (
                msg.includes("Account does not exist") ||
                msg.includes("no data") ||
                msg.includes("deserialize") ||
                msg.includes("null")
            ) {
                setErr("Vault not initialized. Stake tokens to create it.");
            } else {
                setErr(`Failed to load vault: ${msg}`);
            }

            setInfo(null);
        } finally {
            setLoading(false);
        }
    }, [program, walletPublicKey]);

    // Auto-refresh
    useEffect(() => {
        if (!autoRefresh || !walletPublicKey) return;

        handleLoad();
        const interval = setInterval(handleLoad, 10000);
        return () => clearInterval(interval);
    }, [autoRefresh, walletPublicKey, handleLoad]);

    // Load once on connect
    useEffect(() => {
        if (walletPublicKey && program) {
            handleLoad();
        }
    }, [walletPublicKey, program, handleLoad]);

    return (
        <div className="p-6 border border-gray-200 rounded-lg space-y-4 bg-white shadow-sm">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Vault Information</h3>

                <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            className="rounded"
                        />
                        Auto-refresh
                    </label>

                    <button
                        onClick={handleLoad}
                        disabled={loading || !walletPublicKey}
                        className="px-3 py-1.5 rounded-lg bg-slate-700 text-white text-sm font-medium hover:bg-slate-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Loading...
                            </>
                        ) : (
                            "Refresh"
                        )}
                    </button>
                </div>
            </div>

            {/* Error */}
            {err && (
                <div className="p-3 rounded-lg bg-red-50 text-red-800 border border-red-200 text-sm">
                    {err}
                </div>
            )}

            {/* Success */}
            {info && info.data && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-blue-50 rounded-lg">
                            <p className="text-xs text-gray-600 mb-1">Vault Address</p>
                            <p className="text-sm font-mono break-all">{info.address}</p>
                        </div>

                        {info.data.stakedAmount && (
                            <div className="p-4 bg-green-50 rounded-lg">
                                <p className="text-xs text-gray-600 mb-1">Staked Amount</p>
                                <p className="text-xl font-bold text-green-700">
                                    {formatTokenAmount(info.data.stakedAmount)} Tokens
                                </p>
                            </div>
                        )}

                        {info.data.lastStakeTime && (
                            <div className="p-4 bg-purple-50 rounded-lg">
                                <p className="text-xs text-gray-600 mb-1">Last Stake Time</p>
                                <p className="text-sm font-mono">
                                    {new Date(info.data.lastStakeTime.toNumber() * 1000).toLocaleString()}
                                </p>
                            </div>
                        )}

                        {info.data.pendingRewards !== undefined && (
                            <div className="p-4 bg-yellow-50 rounded-lg">
                                <p className="text-xs text-gray-600 mb-1">Pending Rewards</p>
                                <p className="text-xl font-bold text-yellow-700">
                                    {formatTokenAmount(info.data.pendingRewards)} Rewards
                                </p>
                            </div>
                        )}

                        {info.data.owner && (
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <p className="text-xs text-gray-600 mb-1">Owner</p>
                                <p className="text-sm font-mono break-all">
                                    {info.data.owner.toBase58()}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Raw Data */}
                    <details className="mt-4">
                        <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                            Show Raw Data
                        </summary>
                        <pre className="mt-2 p-4 bg-gray-50 rounded-lg text-xs border border-gray-200 overflow-auto max-h-80">
                            {JSON.stringify(
                                info.data,
                                (key, value) =>
                                    value && value._bn
                                        ? value.toString()
                                        : value && value.toBase58
                                            ? value.toBase58()
                                            : value,
                                2
                            )}
                        </pre>
                    </details>
                </div>
            )}

            {/* Empty State */}
            {!info && !err && !loading && walletPublicKey && (
                <div className="text-center py-8 text-gray-500">
                    <p>Click refresh to load vault information</p>
                </div>
            )}

            {!walletPublicKey && (
                <div className="text-center py-8 text-gray-500">
                    <p>Connect your wallet to view vault information</p>
                </div>
            )}
        </div>
    );
}