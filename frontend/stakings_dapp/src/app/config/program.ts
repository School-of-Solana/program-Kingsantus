import { PublicKey } from "@solana/web3.js";
import { Idl } from "@coral-xyz/anchor";
import idl from "./idl.json";

export const PROGRAM_ID = new PublicKey("6jBDgZQh6CgJFE6SvkTBHx4oUHZzF92M3d7qog7KWePz");
export const PROGRAM_ID_STRING = PROGRAM_ID.toBase58();

export const CLUSTER = "devnet";
export const NETWORK = "https://api.devnet.solana.com";

export const STAKE_MINT = new PublicKey("G4RNVJj14rmqDVAodXxXoPah3RRqoUsPeuXmxQRNweKt");
export const REWARD_MINT = new PublicKey("3Ka3e5pQFTGYHCaRjm3TBadrRQxjwnS2yu368wCEHjTo");

export const IDL = idl as Idl;