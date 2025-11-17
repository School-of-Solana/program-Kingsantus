// src/components/UnstakeForm.tsx
"use client";
import React, { useState } from "react";
import BN from "bn.js";
import { SYSVAR_CLOCK_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { useAnchorProgram } from "../lib/anchor";
import { findVaultPda, getVaultTokenAccount, getUserAta } from "../utils/pda";
import { STAKE_MINT } from "../config/program";

function amountToBN(value: string, decimals = 9): BN {
    if (!value || value === "0") return new BN(0);
    const parts = value.split(".");
    const whole = parts[0] || "0";
    const frac = (parts[1] || "").padEnd(decimals, "0").slice(0, decimals);
    return new BN(whole).mul(new BN(10).pow(new BN(decimals))).add(new BN(frac));
}

export default function UnstakeForm() {
    const { program, walletPublicKey } = useAnchorProgram();
    const [amount, setAmount] = useState("");
    const [status, setStatus] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleUnstake = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus(null);
        setLoading(true);

        try {
            if (!program) throw new Error("Program not loaded");
            if (!walletPublicKey) throw new Error("Connect wallet");
            if (!amount || parseFloat(amount) <= 0) throw new Error("Enter valid amount");

            setStatus("Unstaking tokens...");

            const [vaultPda] = findVaultPda(walletPublicKey);
            const vaultTokenAccount = getVaultTokenAccount(vaultPda, STAKE_MINT);
            const userStakeAccount = getUserAta(walletPublicKey, STAKE_MINT);
            const bnAmount = amountToBN(amount, 9);

            const tx = await program.methods
                .unstake(bnAmount)
                .accounts({
                    vault: vaultPda,
                    vaultTokenAccount: vaultTokenAccount,
                    userStakeAccount: userStakeAccount,
                    user: walletPublicKey,
                    stakeMint: STAKE_MINT,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    clock: SYSVAR_CLOCK_PUBKEY,
                })
                .rpc();

            setStatus(`✅ Unstaked successfully! Tx: ${tx.slice(0, 8)}...`);
            setAmount("");
            console.log(`https://explorer.solana.com/tx/${tx}?cluster=devnet`);

        } catch (err: any) {
            console.error("Unstake error:", err);
            let errorMsg = err.message || String(err);
            if (errorMsg.includes("InsufficientStake")) errorMsg = "Insufficient staked amount";
            else if (errorMsg.includes("User rejected")) errorMsg = "Transaction cancelled";
            setStatus(`❌ Error: ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleUnstake} className="p-6 border border-gray-200 rounded-lg space-y-4 bg-white shadow-sm">
            <h3 className="text-lg font-semibold">Unstake Tokens</h3>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount to Unstake
                </label>
                <input
                    type="number"
                    step="0.000000001"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={loading || !walletPublicKey}
                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-100"
                    placeholder="e.g. 1.0"
                />
            </div>

            <button
                type="submit"
                disabled={loading || !walletPublicKey || !amount}
                className="w-full px-4 py-3 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
                {loading ? "Processing..." : !walletPublicKey ? "Connect Wallet" : "Unstake Tokens"}
            </button>

            {status && (
                <div className={`p-3 rounded-lg text-sm ${status.includes("✅") ? "bg-green-50 text-green-800 border border-green-200"
                        : status.includes("❌") ? "bg-red-50 text-red-800 border border-red-200"
                            : "bg-blue-50 text-blue-800 border border-blue-200"
                    }`}>
                    {status}
                </div>
            )}
        </form>
    );
}