import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID, STAKE_MINT } from "../config/program";
import { 
  getAssociatedTokenAddressSync
} from "@solana/spl-token";

/**
 * Vault PDA - stores user staking data
 * Seeds: ["vault", user_pubkey]
 */
export const findVaultPda = (user: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), user.toBuffer()],
    PROGRAM_ID
  );
};


/**
 * Global state PDA
 * Seeds: ["global"]
 */
export function findGlobalStatePda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("global")],
    PROGRAM_ID
  );
}

/**
 * Reward mint authority for claim_rewards
 * Seeds: ["reward_auth", user_pubkey]
 */
export function findRewardAuthPda(user: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("reward_auth"), user.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Global reward mint authority for initialize_program
 * Seeds: ["reward_authority"]
 */
export function findGlobalRewardAuthPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("reward_authority")],
    PROGRAM_ID
  );
}

/**
 * Vault token account - holds staked tokens
 * This is an ATA with seeds: [vault_pda, token_program, stake_mint]
 * The IDL shows it uses the standard ATA derivation
 */
export function getVaultTokenAccount(
  vaultPda: PublicKey,
  stakeMint: PublicKey = STAKE_MINT
): PublicKey {
  // According to IDL, vault_token_account for stake/unstake uses vault as owner
  return getAssociatedTokenAddressSync(
    stakeMint,
    vaultPda,
    true // allowOwnerOffCurve = true (vault is a PDA)
  );
}

/**
 * Vault token account for initialize_vault
 * Uses user as the first seed instead of vault
 */
export function getVaultTokenAccountForInit(
  user: PublicKey,
  stakeMint: PublicKey = STAKE_MINT
): PublicKey {
  // For initialize_vault, the IDL shows seeds: [user, ATA_PROGRAM, stake_mint]
  return getAssociatedTokenAddressSync(
    stakeMint,
    user,
    false // user is not a PDA
  );
}

/**
 * User's ATA for any token mint
 */
export function getUserAta(user: PublicKey, mint: PublicKey): PublicKey {
  return getAssociatedTokenAddressSync(mint, user, false);
}

/**
 * Helper to get the correct vault token account based on context
 */
export function getVaultTokenAta(
  vaultPdaOrUser: PublicKey,
  stakeMint: PublicKey = STAKE_MINT,
  isInitializing: boolean = false
): PublicKey {
  if (isInitializing) {
    return getAssociatedTokenAddressSync(stakeMint, vaultPdaOrUser, false);
  }
  return getAssociatedTokenAddressSync(stakeMint, vaultPdaOrUser, true);
}