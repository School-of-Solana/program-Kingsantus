/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { useAnchorProgram } from "../lib/anchor";
import { useWallet } from "@solana/wallet-adapter-react";
import {
    getAssociatedTokenAddressSync,
    createAssociatedTokenAccountInstruction,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    getMint,
} from "@solana/spl-token";
import {
    PublicKey,
    SystemProgram,
    Transaction,
    SYSVAR_CLOCK_PUBKEY,
    SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import { STAKE_MINT, PROGRAM_ID } from "../config/program";
import { BN } from "@coral-xyz/anchor";
import { findVaultPda } from "../utils/pda";

export default function StakeForm() {
    const { program, provider, isReady } = useAnchorProgram();
    const { publicKey, connected } = useWallet();

    const [amount, setAmount] = useState("");
    const [status, setStatus] = useState("");
    const [loading, setLoading] = useState(false);
    const [needsInit, setNeedsInit] = useState(false);

    useEffect(() => {
        if (isReady && provider && publicKey) checkGlobalState();
    }, [isReady, provider, publicKey]);

    const checkGlobalState = async () => {
        const [globalPda] = PublicKey.findProgramAddressSync([Buffer.from("global")], PROGRAM_ID);
        const info = await provider!.connection.getAccountInfo(globalPda);
        setNeedsInit(!info);
    };

    const initializeProgram = async () => {
        if (!program || !publicKey || !provider) return;
        setLoading(true);
        setStatus("Initializing program...");

        try {
            const [globalState] = PublicKey.findProgramAddressSync([Buffer.from("global")], PROGRAM_ID);
            const [rewardAuth] = PublicKey.findProgramAddressSync([Buffer.from("reward_authority")], PROGRAM_ID);

            await program.methods
                .initializeProgram()
                .accounts({
                    globalState,
                    rewardMintAuthority: rewardAuth,
                    authority: publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();

            setStatus("Program initialized!");
            setNeedsInit(false);
        } catch (err: any) {
            const errorMsg = (err instanceof Error) ? err.message : String(err);
            setStatus(`Init failed: ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    const handleStake = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!program || !publicKey || !provider || !amount || parseFloat(amount) <= 0) return;

        setLoading(true);
        setStatus("Preparing stake...");

        try {
            const amt = parseFloat(amount);
            const mintInfo = await getMint(provider.connection, STAKE_MINT);
            const stakeAmount = new BN(amt * 10 ** mintInfo.decimals);

            const [vaultPda] = findVaultPda(publicKey);
            const userAta = getAssociatedTokenAddressSync(STAKE_MINT, publicKey);
            const vaultAta = getAssociatedTokenAddressSync(STAKE_MINT, vaultPda, true);

            // Create ATAs if missing
            const tx = new Transaction();
            if (!(await provider.connection.getAccountInfo(userAta))) {
                tx.add(createAssociatedTokenAccountInstruction(
                    publicKey, userAta, publicKey, STAKE_MINT,
                    TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
                ));
            }
            if (!(await provider.connection.getAccountInfo(vaultAta))) {
                tx.add(createAssociatedTokenAccountInstruction(
                    publicKey, vaultAta, vaultPda, STAKE_MINT,
                    TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
                ));
            }
            if (tx.instructions.length > 0) {
                setStatus("Creating token accounts...");
                await provider.sendAndConfirm(tx);
            }

            // Initialize vault — safe to call multiple times
            try {
                setStatus("Setting up vault...");
                await program.methods.initializeVault()
                    .accounts({
                        vault: vaultPda,
                        vaultTokenAccount: vaultAta,
                        user: publicKey,
                        stakeMint: STAKE_MINT,
                        systemProgram: SystemProgram.programId,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                        rent: SYSVAR_RENT_PUBKEY,
                        clock: SYSVAR_CLOCK_PUBKEY,
                    })
                    .rpc();
            } catch (err: unknown) {
                if (err instanceof Error) {
                    if (!err.message.includes("already in use") && !err.message.includes("ConstraintSeeds")) {
                        throw err;
                    }
                } else {
                    throw err;
                }
            }

            setStatus("Staking...");
            const sig = await program.methods.stake(stakeAmount)
                .accounts({
                    vault: vaultPda,
                    vaultTokenAccount: vaultAta,
                    userStakeAccount: userAta,
                    user: publicKey,
                    stakeMint: STAKE_MINT,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    clock: SYSVAR_CLOCK_PUBKEY,
                })
                .rpc();

            setStatus(`STAKED ${amount} TOKENS!`);
            alert(`SUCCESS!\nTx: ${sig}\nhttps://explorer.solana.com/tx/${sig}?cluster=devnet`);
            setAmount("");
        } catch (err: any) {
            let errorMsg = "";
            if (err instanceof Error) {
                errorMsg = err.message;
            } else {
                errorMsg = String(err);
            }
            setStatus(`Error: ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    if (!isReady) return <div className="text-center p-6 text-purple-300">Loading...</div>;

    return (
        <div className="p-6 bg-white/5 rounded-xl border border-white/10 space-y-6">
            <h3 className="text-2xl font-bold text-white">Stake Tokens</h3>

            {needsInit && (
                <div className="bg-yellow-600/20 border border-yellow-500 rounded-lg p-4">
                    <p className="text-yellow-300 mb-3">Program needs initialization</p>
                    <button onClick={initializeProgram} disabled={loading} className="w-full py-3 bg-yellow-600 hover:bg-yellow-700 rounded font-bold text-white">
                        {loading ? "Initializing..." : "Initialize Program"}
                    </button>
                </div>
            )}

            <form onSubmit={handleStake} className="space-y-4">
                <input
                    type="number"
                    step="0.000001"
                    placeholder="Amount to stake"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={loading || needsInit}
                    className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:border-purple-500 outline-none"
                />
                <button
                    type="submit"
                    disabled={!connected || loading || !amount || needsInit}
                    className="w-full py-4 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold text-lg disabled:opacity-50"
                >
                    {loading ? "Processing..." : "Stake Tokens"}
                </button>

                {status && (
                    <div className={`p-4 rounded-lg text-center font-medium ${status.includes("Error") ? "bg-red-500/20 text-red-300" : "bg-green-500/20 text-green-300"}`}>
                        {status}
                    </div>
                )}
            </form>
        </div>
    );
}