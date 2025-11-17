use anchor_lang::prelude::*;
use crate::state::Vault;

const YEAR: u128 = 365 * 24 * 60 * 60;

pub fn accrue_rewards(vault: &mut Vault, clock: &Clock) -> Result<()> {
    let now = clock.unix_timestamp;
    let delta = now
        .checked_sub(vault.last_reward_time)
        .ok_or(crate::error::ErrorCode::TimeError)?;

    if delta <= 0 {
        return Ok(());
    }

    let pending: u64 = (vault.staked_amount as u128)
        .checked_mul(10)
        .ok_or(crate::error::ErrorCode::Overflow)?
        .checked_mul(delta as u128)
        .ok_or(crate::error::ErrorCode::Overflow)?
        .checked_div(100 * YEAR)
        .ok_or(crate::error::ErrorCode::Overflow)?
        .try_into()
        .map_err(|_| crate::error::ErrorCode::Overflow)?;

    vault.reward_debt = vault
        .reward_debt
        .checked_add(pending)
        .ok_or(crate::error::ErrorCode::Overflow)?;

    vault.last_reward_time = now;

    Ok(())
}