"use client";

import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { useMemo } from "react";
import { IDL } from "../config/program";

interface MinimalWallet {
  publicKey: PublicKey;
  signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T>;
  signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]>;
}

export function useAnchorProgram() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const provider = useMemo(() => {
    if (
      !wallet.connected ||
      !wallet.publicKey ||
      !wallet.signTransaction ||
      !wallet.signAllTransactions
    ) {
      return null;
    }

    const anchorWallet: MinimalWallet = {
      publicKey: wallet.publicKey,
      signTransaction: wallet.signTransaction.bind(wallet),
      signAllTransactions: wallet.signAllTransactions.bind(wallet),
    };

    return new AnchorProvider(connection, anchorWallet, { commitment: "confirmed" });
  }, [connection, wallet]);

  const program = useMemo(() => {
    if (!provider) return null;

    try {
      const prog = new Program(IDL, provider);
      return prog;
    } catch (error) {
      console.error("Program init failed:", error instanceof Error ? error.message : String(error));
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