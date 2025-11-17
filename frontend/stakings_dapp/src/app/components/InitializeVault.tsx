// components/InitializeVault.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, SYSVAR_CLOCK_PUBKEY } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { useState } from "react";

const WSOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");

interface Props {
    program: any;
    publicKey: PublicKey;
    onSuccess: () => void;
}

export default function InitializeVault({ program, publicKey, onSuccess }: Props) {
    const [loading, setLoading] = useState(false);

    const initialize = async () => {
        setLoading(true);
        try {
            const [vaultPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("vault"), publicKey.toBuffer()],
                program.programId
            );

            const vaultTokenAccount = getAssociatedTokenAddressSync(WSOL_MINT, vaultPda, true);

            const txSig = await program.methods
                .initializeVault()
                .accounts({
                    vault: vaultPda,
                    vaultTokenAccount,
                    user: publicKey,
                    stakeMint: WSOL_MINT,
                    systemProgram: SystemProgram.programId,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                    rent: SYSVAR_RENT_PUBKEY,
                    clock: SYSVAR_CLOCK_PUBKEY,
                })
                .rpc();

            toast.success("Vault Initialized!", {
                description: <a href={`https://solana.fm/tx/${txSig}`} target="_blank" rel="noopener noreferrer" className="underline">View Tx</a>,
            });
            onSuccess();
        } catch (err: any) {
            toast.error("Failed to initialize vault", {
                description: err.logs?.join("\n") || err.message,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-purple-900 to-blue-900 flex items-center justify-center p-4">
            <Card className="p-8 max-w-md w-full">
                <h2 className="text-2xl font-bold mb-4 text-white">Create Your Vault</h2>
                <p className="text-sm text-gray-300 mb-6">One-time setup for staking</p>
                <Button onClick={initialize} disabled={loading} className="w-full bg-green-600 hover:bg-green-700">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create Vault"}
                </Button>
            </Card>
        </div>
    );
}