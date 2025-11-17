// src/components/StakeForm.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useAnchorProgram } from "../lib/anchor";
import { useWallet } from "@solana/wallet-adapter-react";
import {
    getAssociatedTokenAddressSync,
    createAssociatedTokenAccountInstruction,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    getMint,
} from "@solana/spl-token";
import {
    SystemProgram,
    SYSVAR_RENT_PUBKEY,
    Transaction,
    PublicKey,
    Connection,
    SYSVAR_CLOCK_PUBKEY,
    TransactionInstruction,
} from "@solana/web3.js";
import { STAKE_MINT, PROGRAM_ID, REWARD_MINT } from "../config/program";
import { BN } from "@coral-xyz/anchor";
import { findVaultPda } from "../utils/pda";

export default function StakeForm() {
    const { program, isReady, provider } = useAnchorProgram();
    const { publicKey, sendTransaction, signTransaction } = useWallet();
    const [amount, setAmount] = useState("");
    const [status, setStatus] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [needsInitialization, setNeedsInitialization] = useState(false);

    // Check if global_state exists (run on mount if ready)
    useEffect(() => {
        if (isReady && provider) {
            checkGlobalState().then((needsInit) => setNeedsInitialization(!needsInit)).catch(console.error);
        }
    }, [isReady, provider]);

    const checkGlobalState = async () => {
        if (!provider) return false;
        const [globalStatePda] = PublicKey.findProgramAddressSync([Buffer.from("global")], PROGRAM_ID);
        const globalStateInfo = await provider.connection.getAccountInfo(globalStatePda);
        return !!globalStateInfo;
    };

    // Initialize the program
    const handleInitializeProgram = async () => {
        if (!isReady || !program || !publicKey || !provider || !signTransaction) {
            setStatus("Wallet not connected or program not ready");
            return;
        }

        setLoading(true);
        setStatus("Initializing program...");

        try {
            // Check SOL balance
            const balance = await provider.connection.getBalance(publicKey);
            if (balance < 0.005 * 1_000_000_000) {
                setStatus("Insufficient SOL for transaction fees (need ~0.005 SOL)");
                setLoading(false);
                return;
            }

            // Derive PDAs
            const [globalStatePda, globalStateBump] = PublicKey.findProgramAddressSync(
                [Buffer.from("global")],
                PROGRAM_ID
            );
            const [rewardMintAuthorityPda, rewardMintAuthorityBump] = PublicKey.findProgramAddressSync(
                [Buffer.from("reward_authority_init")],
                PROGRAM_ID
            );

            // Validate PublicKeys
            const accounts = {
                globalState: globalStatePda,
                rewardMintAuthority: rewardMintAuthorityPda,
                authority: publicKey,
                systemProgram: SystemProgram.programId,
                rewardMint: REWARD_MINT, // Include in case IDL requires it
            };
            for (const [name, pubkey] of Object.entries(accounts)) {
                try {
                    new PublicKey(pubkey.toBase58());
                    console.log(`Validated ${name}: ${pubkey.toBase58()}`);
                } catch (err) {
                    throw new Error(`Invalid PublicKey for ${name}: ${pubkey.toBase58()} - ${err.message}`);
                }
            }

            // Log PDAs and raw bytes
            console.log("PDAs for initialize_program:", {
                globalStatePda: globalStatePda.toBase58(),
                globalStateBump,
                globalStateRaw: globalStatePda.toBuffer().toString("hex"),
                rewardMintAuthorityPda: rewardMintAuthorityPda.toBase58(),
                rewardMintAuthorityBump,
                rewardMintAuthorityRaw: rewardMintAuthorityPda.toBuffer().toString("hex"),
                authority: publicKey.toBase58(),
                authorityRaw: publicKey.toBuffer().toString("hex"),
                systemProgram: SystemProgram.programId.toBase58(),
                systemProgramRaw: SystemProgram.programId.toBuffer().toString("hex"),
                rewardMint: REWARD_MINT.toBase58(),
                rewardMintRaw: REWARD_MINT.toBuffer().toString("hex"),
            });

            // Build transaction
            const tx = new Transaction();
            tx.feePayer = publicKey;

            // Try Anchor instruction first
            let instruction;
            try {
                instruction = await program.methods
                    .initializeProgram()
                    .accounts({
                        globalState: globalStatePda,
                        rewardMintAuthority: rewardMintAuthorityPda,
                        authority: publicKey,
                        systemProgram: SystemProgram.programId,
                        rewardMint: REWARD_MINT, // Try including rewardMint
                    })
                    .instruction();
            } catch (err) {
                console.error("Failed to build Anchor instruction with rewardMint:", err);
                // Try without rewardMint
                instruction = await program.methods
                    .initializeProgram()
                    .accounts({
                        globalState: globalStatePda,
                        rewardMintAuthority: rewardMintAuthorityPda,
                        authority: publicKey,
                        systemProgram: SystemProgram.programId,
                    })
                    .instruction();
            }
            tx.add(instruction);

            // Log detailed instruction keys
            console.log("Instruction details:", {
                programId: program.programId.toBase58(),
                keys: instruction.keys.map((key, index) => ({
                    pubkey: key.pubkey.toBase58(),
                    isWritable: key.isWritable,
                    isSigner: key.isSigner,
                    accountName: ['globalState', 'rewardMintAuthority', 'authority', 'systemProgram', 'rewardMint'][index] || `unknown${index}`,
                })),
                data: instruction.data.toString("hex"),
            });

            // Partially sign the transaction for simulation
            setStatus("Preparing transaction for simulation...");
            const signedTx = await signTransaction(tx);

            // Simulate transaction
            setStatus("Simulating program initialization...");
            const simulation = await provider.connection.simulateTransaction(signedTx, [], { commitment: "processed" });
            if (simulation.value.err) {
                console.error("Simulation Error:", simulation.value.err);
                console.error("Simulation Logs:", simulation.value.logs);
                setStatus(
                    `Simulation failed: ${JSON.stringify(simulation.value.err)}\nLogs: ${simulation.value.logs?.join("\n") || "No logs"}`
                );
                setLoading(false);
                return;
            }

            // Send transaction
            setStatus("Sending initialization transaction...");
            const sig = await sendTransaction(tx, provider.connection);
            setStatus("Confirming transaction...");
            await provider.connection.confirmTransaction(sig, "confirmed");

            // Verify global_state was created
            const globalStateExists = await checkGlobalState();
            if (!globalStateExists) {
                throw new Error("Global state creation failed—check transaction logs");
            }

            // Success
            const url = `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
            setStatus("Program initialized successfully!");
            alert(`Program initialized!\nTx: ${sig}\n\n${url}`);
            setNeedsInitialization(false);
        } catch (err: any) {
            console.error("Initialize Program Error:", err);
            if (err.logs) {
                console.error("Transaction Logs:", err.logs);
            }
            setStatus(`Error: ${err.message || "Program initialization failed"}`);
        } finally {
            setLoading(false);
        }
    };

    const handleStake = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isReady || !program || !publicKey || !provider || !amount) {
            setStatus("Invalid input or wallet not connected");
            return;
        }

        setLoading(true);
        setStatus("Preparing transaction...");

        try {
            // Validate amount
            const parsedAmount = parseFloat(amount);
            if (isNaN(parsedAmount) || parsedAmount <= 0) {
                setStatus("Invalid amount");
                setLoading(false);
                return;
            }

            // Check SOL balance for fees
            const balance = await provider.connection.getBalance(publicKey);
            if (balance < 0.005 * 1_000_000_000) {
                setStatus("Insufficient SOL for transaction fees (need ~0.005 SOL)");
                setLoading(false);
                return;
            }

            // Verify STAKE_MINT
            setStatus("Verifying token mint...");
            try {
                const mintAccountInfo = await provider.connection.getAccountInfo(STAKE_MINT);
                if (!mintAccountInfo) {
                    setStatus(`Invalid STAKE_MINT: ${STAKE_MINT.toBase58()} does not exist`);
                    setLoading(false);
                    return;
                }
                if (
                    mintAccountInfo.owner.toBase58() !== "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" &&
                    mintAccountInfo.owner.toBase58() !== "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
                ) {
                    setStatus(`Invalid STAKE_MINT: Not owned by SPL Token or Token-2022 program`);
                    setLoading(false);
                    return;
                }
            } catch (err: any) {
                console.error("STAKE_MINT Validation Error:", err);
                setStatus(`Error validating STAKE_MINT: ${err.message}`);
                setLoading(false);
                return;
            }

            // Check global_state
            setStatus("Checking program initialization...");
            const globalStateExists = await checkGlobalState();
            if (!globalStateExists) {
                setStatus("Global state not initialized. Please initialize the program first.");
                setNeedsInitialization(true);
                setLoading(false);
                return;
            }

            // Get mint decimals
            setStatus("Fetching token mint info...");
            const mintInfo = await getMint(provider.connection, STAKE_MINT, "confirmed", TOKEN_2022_PROGRAM_ID);
            const lamports = new BN(Math.floor(parsedAmount * Math.pow(10, mintInfo.decimals)));
            console.log("Lamports:", lamports.toString());

            // Derive PDAs and token accounts
            const [vaultPda] = findVaultPda(publicKey);
            const userStakeAta = getAssociatedTokenAddressSync(STAKE_MINT, publicKey, false, TOKEN_2022_PROGRAM_ID);
            const vaultTokenAccount = getAssociatedTokenAddressSync(STAKE_MINT, publicKey, false, TOKEN_2022_PROGRAM_ID);

            // Log all PublicKeys for debugging
            console.log("PublicKeys:", {
                vaultPda: vaultPda.toBase58(),
                vaultTokenAccount: vaultTokenAccount.toBase58(),
                userStakeAta: userStakeAta.toBase58(),
                stakeMint: STAKE_MINT.toBase58(),
                user: publicKey.toBase58(),
                systemProgram: SystemProgram.programId.toBase58(),
                tokenProgram: TOKEN_2022_PROGRAM_ID.toBase58(),
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID.toBase58(),
                rent: SYSVAR_RENT_PUBKEY.toBase58(),
                clock: SYSVAR_CLOCK_PUBKEY.toBase58(),
            });

            // Check token balance
            setStatus("Checking token balance...");
            let tokenBalance = 0;
            try {
                const tokenAccount = await provider.connection.getTokenAccountBalance(userStakeAta);
                tokenBalance = tokenAccount.value.uiAmount || 0;
            } catch {
                setStatus(`Token account not found for ${STAKE_MINT.toBase58()}. Please deposit tokens.`);
                setLoading(false);
                return;
            }
            if (tokenBalance < parsedAmount) {
                setStatus(`Insufficient token balance: ${tokenBalance} available`);
                setLoading(false);
                return;
            }

            const tx = new Transaction();
            tx.feePayer = publicKey;

            const instructions: string[] = [];

            // Create user ATA if it doesn't exist
            if (!(await provider.connection.getAccountInfo(userStakeAta))) {
                setStatus("Creating user token account...");
                const instruction = createAssociatedTokenAccountInstruction(
                    publicKey,
                    userStakeAta,
                    publicKey,
                    STAKE_MINT,
                    TOKEN_2022_PROGRAM_ID
                );
                tx.add(instruction);
                instructions.push("Create User ATA");
            }

            // Check vault existence (fallback if IDL lacks vault account)
            let vaultExists = false;
            try {
                // Note: This line will fail until IDL is fixed
                const vaultAccount = await program.account.vault.fetch(vaultPda);
                vaultExists = true;
                console.log("Vault Account:", vaultAccount);
            } catch (err) {
                console.log("Vault fetch failed (likely IDL issue), assuming vault does not exist:", err);
            }

            if (!vaultExists) {
                setStatus("Creating vault...");

                // Create vault ATA
                if (!(await provider.connection.getAccountInfo(vaultTokenAccount))) {
                    const instruction = createAssociatedTokenAccountInstruction(
                        publicKey,
                        vaultTokenAccount,
                        publicKey,
                        STAKE_MINT,
                        TOKEN_2022_PROGRAM_ID
                    );
                    tx.add(instruction);
                    instructions.push("Create Vault ATA");
                }

                // Initialize vault
                try {
                    const instruction = await program.methods
                        .initializeVault()
                        .accounts({
                            vault: vaultPda,
                            vaultTokenAccount,
                            user: publicKey,
                            stakeMint: STAKE_MINT,
                            systemProgram: SystemProgram.programId,
                            tokenProgram: TOKEN_2022_PROGRAM_ID,
                            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                            rent: SYSVAR_RENT_PUBKEY,
                            clock: SYSVAR_CLOCK_PUBKEY,
                        })
                        .instruction();
                    tx.add(instruction);
                    instructions.push("Initialize Vault");
                } catch (err: any) {
                    console.error("Initialize Vault Error:", err);
                    throw new Error(`Failed to build initializeVault instruction: ${err.message}`);
                }
            }

            // Stake instruction
            setStatus("Building stake instruction...");
            try {
                const stakeInstruction = await program.methods
                    .stake(lamports)
                    .accounts({
                        user: publicKey,
                        vault: vaultPda,
                        userStakeAccount: userStakeAta,
                        vaultTokenAccount,
                        stakeMint: STAKE_MINT,
                        tokenProgram: TOKEN_2022_PROGRAM_ID,
                        clock: SYSVAR_CLOCK_PUBKEY,
                    })
                    .instruction();
                tx.add(stakeInstruction);
                instructions.push("Stake");
            } catch (err: any) {
                console.error("Stake Instruction Error:", err);
                throw new Error(`Failed to build stake instruction: ${err.message}`);
            }

            console.log("Transaction Instructions:", instructions);

            // Simulate transaction
            setStatus("Simulating transaction...");
            const signedStakeTx = await signTransaction(tx);
            const simulation = await provider.connection.simulateTransaction(signedStakeTx, [], { commitment: "processed" });
            if (simulation.value.err) {
                console.error("Simulation Error:", simulation.value.err);
                console.error("Simulation Logs:", simulation.value.logs);
                setStatus(
                    `Simulation failed: ${JSON.stringify(simulation.value.err)}\nLogs: ${simulation.value.logs?.join("\n") || "No logs"}`
                );
                setLoading(false);
                return;
            }

            // Send transaction
            setStatus("Sending transaction...");
            const sig = await sendTransaction(tx, provider.connection);
            setStatus("Confirming transaction...");
            await provider.connection.confirmTransaction(sig, "confirmed");

            // Success
            const url = `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
            setStatus(`Staked ${amount} tokens successfully!`);
            alert(`Staked ${amount} tokens!\nTx: ${sig}\n\n${url}`);
            console.log("Transaction URL:", url);
            setAmount("");
        } catch (err: any) {
            console.error("Transaction Error:", err);
            console.error("STAKE_MINT:", STAKE_MINT.toBase58());
            const accountInfo = await provider.connection.getAccountInfo(STAKE_MINT);
            console.error("STAKE_MINT Account Info:", accountInfo);
            if (err.logs) {
                console.error("Transaction Logs:", err.logs);
            }
            setStatus(`Error: ${err.message || "Transaction failed"}`);
        } finally {
            setLoading(false);
        }
    };

    if (!isReady) {
        return <div className="p-6 text-center text-purple-200">Loading...</div>;
    }

    return (
        <div className="p-6 bg-white/5 rounded-xl border border-white/10 space-y-4">
            <h3 className="text-xl font-bold text-white">Stake Tokens</h3>
            {needsInitialization && (
                <div className="space-y-2">
                    <p className="text-red-300 text-sm">
                        Program needs initialization before staking.
                    </p>
                    <button
                        onClick={handleInitializeProgram}
                        disabled={loading || !publicKey || !isReady}
                        className="w-full py-3 rounded bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold disabled:opacity-50"
                    >
                        {loading ? "Processing..." : "Initialize Program"}
                    </button>
                </div>
            )}
            <form onSubmit={handleStake}>
                <input
                    type="number"
                    step="0.01"
                    placeholder="0.1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={loading || !publicKey || needsInitialization}
                    className="w-full p-3 rounded bg-white/10 text-white border border-white/20 focus:border-purple-500 mb-4"
                />
                <button
                    type="submit"
                    disabled={
                        loading ||
                        !publicKey ||
                        !amount ||
                        parseFloat(amount) <= 0 ||
                        !isReady ||
                        needsInitialization
                    }
                    className="w-full py-3 rounded bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold disabled:opacity-50"
                >
                    {loading ? "Processing..." : "Stake Tokens"}
                </button>
                {status && (
                    <div
                        className={`p-3 rounded text-sm text-center ${status.includes("successfully")
                                ? "bg-green-500/20 text-green-300"
                                : "bg-red-500/20 text-red-300"
                            }`}
                    >
                        {status}
                    </div>
                )}
            </form>
        </div>
    );
}