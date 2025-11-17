// src/components/ClaimRewards.tsx
"use client";
import React, { useState } from "react";
import { SystemProgram, SYSVAR_CLOCK_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { useAnchorProgram } from "../lib/anchor";
import { findVaultPda, findRewardAuthPda, getUserAta } from "../utils/pda";
import { REWARD_MINT } from "../config/program";

export default function ClaimRewards() {
    const { program, walletPublicKey } = useAnchorProgram();
    const [status, setStatus] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleClaim = async () => {
        setStatus(null);
        setLoading(true);

        try {
            if (!program) throw new Error("Program not loaded");
            if (!walletPublicKey) throw new Error("Connect wallet");

            setStatus("Claiming rewards...");

            const [vaultPda] = findVaultPda(walletPublicKey);
            const [rewardAuthPda] = findRewardAuthPda(walletPublicKey);
            const userRewardAccount = getUserAta(walletPublicKey, REWARD_MINT);

            const tx = await program.methods
                .claimRewards()
                .accounts({
                    vault: vaultPda,
                    rewardMintAuthority: rewardAuthPda,
                    rewardMint: REWARD_MINT,
                    userRewardAccount: userRewardAccount,
                    user: walletPublicKey,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    clock: SYSVAR_CLOCK_PUBKEY,
                })
                .rpc();

            setStatus(`✅ Rewards claimed! Tx: ${tx.slice(0, 8)}...`);
            console.log(`https://explorer.solana.com/tx/${tx}?cluster=devnet`);

        } catch (err: any) {
            console.error("Claim error:", err);
            let errorMsg = err.message || String(err);
            if (errorMsg.includes("User rejected")) errorMsg = "Transaction cancelled";
            setStatus(`❌ Error: ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 border border-gray-200 rounded-lg space-y-4 bg-white shadow-sm">
            <h3 className="text-lg font-semibold">Claim Rewards</h3>

            <button
                onClick={handleClaim}
                disabled={loading || !walletPublicKey}
                className="w-full px-4 py-3 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
                {loading ? "Claiming..." : !walletPublicKey ? "Connect Wallet" : "Claim Rewards"}
            </button>

            {status && (
                <div className={`p-3 rounded-lg text-sm ${status.includes("✅") ? "bg-green-50 text-green-800 border border-green-200"
                        : status.includes("❌") ? "bg-red-50 text-red-800 border border-red-200"
                            : "bg-blue-50 text-blue-800 border border-blue-200"
                    }`}>
                    {status}
                </div>
            )}
        </div>
    );
}