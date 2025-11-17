/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState } from "react";
import {
    SYSVAR_CLOCK_PUBKEY,
    PublicKey,
    Transaction,
} from "@solana/web3.js";
import {
    TOKEN_PROGRAM_ID,
    getAssociatedTokenAddressSync,
    createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import { useAnchorProgram } from "../lib/anchor";
import { REWARD_MINT, PROGRAM_ID } from "../config/program";

export default function ClaimRewards() {
    const { program, walletPublicKey, provider } = useAnchorProgram();
    const [status, setStatus] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleClaim = async () => {
        if (!program || !walletPublicKey || !provider) return;

        setLoading(true);
        setStatus(null);

        try {
            // 1. PDAs
            const [rewardMintAuthority] = PublicKey.findProgramAddressSync(
                [Buffer.from("reward_authority")],
                PROGRAM_ID
            );

            const userRewardAta = getAssociatedTokenAddressSync(
                REWARD_MINT,
                walletPublicKey
            );

            const [vaultPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("vault"), walletPublicKey.toBuffer()],
                PROGRAM_ID
            );

            // 2. Check if user's reward ATA exists — if not, create it!
            const ataInfo = await provider.connection.getAccountInfo(userRewardAta);
            if (!ataInfo) {
                setStatus("Creating your reward token account... (first time only)");
                const createAtaTx = new Transaction().add(
                    createAssociatedTokenAccountInstruction(
                        walletPublicKey,     // payer
                        userRewardAta,       // ata to create
                        walletPublicKey,     // owner
                        REWARD_MINT          // mint
                    )
                );

                const sig = await provider.sendAndConfirm(createAtaTx);
                console.log("ATA created:", sig);
                setStatus("Reward account ready! Now claiming...");
            }

            // 3. Claim rewards
            setStatus("Claiming your rewards...");

            const tx = await program.methods
                .claimRewards()
                .accounts({
                    vault: vaultPda,
                    rewardMintAuthority,
                    rewardMint: REWARD_MINT,
                    userRewardAccount: userRewardAta,
                    user: walletPublicKey,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    clock: SYSVAR_CLOCK_PUBKEY,
                })
                .rpc();

            setStatus(`Rewards claimed! Tx: ${tx.slice(0, 8)}...`);
            console.log(`https://explorer.solana.com/tx/${tx}?cluster=devnet`);
        } catch (err: any) {
            console.error("Claim failed:", err);
            const msg = err.message || err.toString();
            if (msg.includes("User rejected")) {
                setStatus("Cancelled by user");
            } else if (msg.includes("AccountNotInitialized")) {
                setStatus("Still creating account... try again in 5 seconds");
            } else {
                setStatus(`Error: ${msg}`);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 border border-green-300 rounded-xl space-y-4 bg-gradient-to-br from-green-50 to-white shadow-lg">
            <h3 className="text-2xl font-bold text-green-800">Claim Rewards</h3>
            <p className="text-sm text-gray-600">
                Fresh rewards minted live — no pre-mint, pure Naija yield!
            </p>

            <button
                onClick={handleClaim}
                disabled={loading || !walletPublicKey || !program}
                className="w-full py-4 px-6 rounded-xl bg-green-600 text-white font-bold text-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-md"
            >
                {loading
                    ? "Working magic..."
                    : !walletPublicKey
                        ? "Connect Wallet"
                        : "Claim Rewards"}
            </button>

            {status && (
                <div
                    className={`p-4 rounded-lg text-sm font-medium border-2 ${status.includes("claimed")
                            ? "bg-green-100 text-green-900 border-green-500"
                            : status.includes("Creating") || status.includes("ready")
                                ? "bg-blue-100 text-blue-900 border-blue-500"
                                : "bg-red-100 text-red-900 border-red-500"
                        }`}
                >
                    {status}
                </div>
            )}
        </div>
    );
}