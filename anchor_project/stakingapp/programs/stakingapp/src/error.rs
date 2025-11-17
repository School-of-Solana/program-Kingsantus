use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Insufficient staked amount")]
    InsufficientStake,
    #[msg("Reward mint authority mismatch")]
    InvalidRewardAuthority,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Time calculation error")]
    TimeError,
    #[msg("Only the vault creator can set authority")]
    Unauthorized,
    #[msg("Vault authority already set")]
    AlreadySet,
}

// #[msg("No rewards available to claim.")]
//     NoRewardsAvailable,