// src/lib/anchor.ts
"use client";

import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useMemo } from "react";
import { IDL } from "../config/program";

console.log("useAnchorProgram: IDL loaded →", IDL.name, "Address:", IDL.address);

export function useAnchorProgram() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const provider = useMemo(() => {
    if (
      !wallet?.connected ||
      !wallet?.publicKey ||
      typeof wallet?.signTransaction !== "function" ||
      typeof wallet?.signAllTransactions !== "function"
    ) {
      console.log("Provider: waiting for wallet.signTransaction...");
      return null;
    }

    console.log("Provider: READY");
    return new AnchorProvider(connection, wallet, { commitment: "confirmed" });
  }, [connection, wallet?.connected, wallet?.publicKey, wallet?.signTransaction, wallet?.signAllTransactions]);

  const program = useMemo(() => {
    if (!provider) return null;

    try {
      const prog = new Program(IDL, provider);
      console.log("Program loaded:", prog.idl.name, "at", prog.programId.toBase58());
      return prog;
    } catch (error: any) {
      console.error("Program init failed:", error.message);
      return null;
    }
  }, [provider]);

  return {
    program,
    provider,
    walletPublicKey: wallet.publicKey,
    isReady: !!program && !!wallet.signTransaction,
  };
}