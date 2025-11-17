use crate::error::ErrorCode;
use crate::state::Vault;
use anchor_lang::prelude::*;

pub fn handler(ctx: Context<GetYield>) -> Result<u64> {
    let vault = &ctx.accounts.vault;
    let now = ctx.accounts.clock.unix_timestamp;

    let pending = if now > vault.last_reward_time {
        const YEAR: u128 = 365 * 24 * 60 * 60;
        let delta = (now - vault.last_reward_time) as u128;

        (vault.staked_amount as u128)
            .checked_mul(10)
            .ok_or(ErrorCode::Overflow)?
            .checked_mul(delta)
            .ok_or(ErrorCode::Overflow)?
            .checked_div(100 * YEAR)
            .ok_or(ErrorCode::Overflow)? as u64
    } else {
        0
    };

    let total = vault
        .reward_debt
        .checked_add(pending)
        .ok_or(ErrorCode::Overflow)?;

    msg!("Yield for {}: {}", ctx.accounts.user.key(), total);
    Ok(total)
}

#[derive(Accounts)]
pub struct GetYield<'info> {
    #[account(seeds = [b"vault", user.key().as_ref()], bump)]
    pub vault: Account<'info, Vault>,

    /// CHECK: Safe — we only use user.key() to derive the vault PDA.
    /// The vault PDA is validated via seeds and bump.
    /// No data is loaded from this account.
    pub user: UncheckedAccount<'info>,

    pub clock: Sysvar<'info, Clock>,
}