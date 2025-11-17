// src/config/program.ts
import { PublicKey } from "@solana/web3.js";
import idlJson from "./idl.json";
import type { Idl } from "@coral-xyz/anchor";

export const PROGRAM_ID = new PublicKey("6FmWYQ81oXzFuMMzU2UawfcMXFuLYeLLjM6QjexbzhsW");
export const PROGRAM_ID_STRING = PROGRAM_ID.toBase58();

export const CLUSTER = "devnet";
export const NETWORK = "https://api.devnet.solana.com";

export const STAKE_MINT = new PublicKey("G4RNVJj14rmqDVAodXxXoPah3RRqoUsPeuXmxQRNweKt");
export const REWARD_MINT = new PublicKey("BNqibPC9Rv7bzuSsnNRuEMudXeV4eYzzqdUoheFcVCnr");

// ————————————————————————
// FIX: Convert discriminators + ADD address
// ————————————————————————
function fixDiscriminators(idl: any): Idl {
  const convert = (arr: number[]) => new Uint8Array(arr);

  return {
    ...idl,
    address: PROGRAM_ID.toBase58(), // ← REQUIRED
    name: idl.metadata.name,
    version: idl.metadata.version,
    instructions: idl.instructions.map((ix: any) => ({
      ...ix,
      discriminator: convert(ix.discriminator),
    })),
    accounts: idl.accounts.map((acc: any) => ({
      ...acc,
      discriminator: convert(acc.discriminator),
    })),
    events: (idl.events || []).map((ev: any) => ({
      ...ev,
      discriminator: convert(ev.discriminator),
    })),
    metadata: undefined,
  } as Idl;
}

const rawIdl = idlJson as any;
export const IDL = fixDiscriminators(rawIdl);

// DEBUG
console.log("Fixed IDL:", {
  address: IDL.address,
  name: IDL.name,
  instructions: IDL.instructions.length,
});