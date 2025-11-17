use crate::error::ErrorCode;
use crate::state::Vault;
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

pub fn handler(ctx: Context<ClaimRewards>) -> Result<()> {
    let vault = &mut ctx.accounts.vault;

    accrue_rewards(vault, &ctx.accounts.clock)?;

    let total_reward = vault.reward_debt;
    if total_reward == 0 {
        return Ok(());
    }

    let user_key = ctx.accounts.user.key();
    let seeds = &[
        b"reward_auth".as_ref(),
        user_key.as_ref(),
        &[ctx.bumps.reward_mint_authority],
    ];
    let signer = &[&seeds[..]];

    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_accounts = anchor_spl::token::MintTo {
        mint: ctx.accounts.reward_mint.to_account_info(),
        to: ctx.accounts.user_reward_account.to_account_info(),
        authority: ctx.accounts.reward_mint_authority.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
    anchor_spl::token::mint_to(cpi_ctx, total_reward)?;

    vault.reward_debt = 0;
    vault.last_reward_time = ctx.accounts.clock.unix_timestamp;

    Ok(())
}

#[derive(Accounts)]
pub struct ClaimRewards<'info> {
    #[account(
        mut,
        seeds = [b"vault", user.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, Vault>,

    /// CHECK: This is the PDA authority for the reward mint.
    /// Seeds: [b"reward_auth", user.key()]
    #[account(
        seeds = [b"reward_auth", user.key().as_ref()],
        bump
    )]
    pub reward_mint_authority: UncheckedAccount<'info>,

    #[account(mut)]
    pub reward_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = reward_mint,
        associated_token::authority = user
    )]
    pub user_reward_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Interface<'info, TokenInterface>,

    pub clock: Sysvar<'info, Clock>,
}

const YEAR: u128 = 365 * 24 * 60 * 60;

fn accrue_rewards(vault: &mut Vault, clock: &Sysvar<Clock>) -> Result<()> {
    let now = clock.unix_timestamp;
    let delta = now.checked_sub(vault.last_reward_time).ok_or(ErrorCode::TimeError)?;
    if delta <= 0 {
        return Ok(());
    }

    let pending = (vault.staked_amount as u128)
        .checked_mul(10)
        .ok_or(ErrorCode::Overflow)?
        .checked_mul(delta as u128)
        .ok_or(ErrorCode::Overflow)?
        .checked_div(100 * YEAR)
        .ok_or(ErrorCode::Overflow)? as u64;

    vault.reward_debt = vault
        .reward_debt
        .checked_add(pending)
        .ok_or(ErrorCode::Overflow)?;
    vault.last_reward_time = now;

    Ok(())
}