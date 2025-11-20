/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAnchorProgram } from "../lib/anchor";
import { findVaultPda } from "../utils/pda";
import { BN } from "@coral-xyz/anchor";
import type { Stakingapp } from "../config/stakingapp";
import { Program } from "@coral-xyz/anchor";

function formatTokenAmount(amount: BN | number, decimals = 9): string {
    const bn = typeof amount === "number" ? new BN(amount) : amount;
    const divisor = new BN(10).pow(new BN(decimals));
    const whole = bn.div(divisor).toString();
    const fraction = bn.mod(divisor).toString().padStart(decimals, "0");
    return `${whole}.${fraction.slice(0, 4)}`;
}

export default function VaultInfo() {
    const { program, walletPublicKey } = useAnchorProgram();

    const typedProgram = program as unknown as Program<Stakingapp>;

    const [info, setInfo] = useState<any>(null);
    const [err, setErr] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleLoad = useCallback(async () => {
        if (!typedProgram || !walletPublicKey) return;

        setLoading(true);
        setErr(null);

        try {
            const [vaultPda] = findVaultPda(walletPublicKey);

            const vaultAcc = await typedProgram.account.vault.fetchNullable(vaultPda);

            if (!vaultAcc) {
                setErr("Vault not initialized. Stake first to create it.");
                setInfo(null);
                return;
            }

            setInfo({
                address: vaultPda.toBase58(),
                data: vaultAcc,
            });
        } catch (e: any) {
            console.error(e);
            setErr("Vault not found. Stake some tokens first!");
            setInfo(null);
        } finally {
            setLoading(false);
        }
    }, [typedProgram, walletPublicKey]);

    useEffect(() => {
        if (walletPublicKey && typedProgram) {
            handleLoad();
            const id = setInterval(handleLoad, 8000);
            return () => clearInterval(id);
        }
    }, [walletPublicKey, typedProgram, handleLoad]);

    // ... rest of your beautiful UI
    return (
        <div className="p-8 rounded-2xl bg-gradient-to-br from-green-50 to-white border-4 border-green-600">
            <h2 className="text-3xl font-bold text-green-800 mb-6">YOUR VAULT</h2>

            {err && <div className="p-4 bg-red-100 rounded-lg text-red-800">{err}</div>}

            {info && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="p-6 bg-green-100 rounded-xl">
                            <p className="text-gray-700">Staked</p>
                            <p className="text-4xl font-bold text-green-800">
                                {formatTokenAmount(info.data.stakedAmount || 0)}
                            </p>
                        </div>
                        <div className="p-6 bg-yellow-100 rounded-xl">
                            <p className="text-gray-700">Rewards</p>
                            <p className="text-4xl font-bold text-yellow-700">
                                {formatTokenAmount(info.data.rewardDebt || 0)}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}