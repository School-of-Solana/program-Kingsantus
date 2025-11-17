use crate::error::ErrorCode;
use crate::state::Vault;
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{TokenInterface, TokenAccount};

pub fn handler(ctx: Context<Unstake>, amount: u64) -> Result<()> {
    require!(amount > 0, ErrorCode::InsufficientStake);

    let vault_info = ctx.accounts.vault.to_account_info();

    let vault = &mut ctx.accounts.vault;
    require!(vault.staked_amount >= amount, ErrorCode::InsufficientStake);

    accrue_rewards(vault, &ctx.accounts.clock)?;

    let user_key = ctx.accounts.user.key();
    let seeds = &[
        b"vault".as_ref(),
        user_key.as_ref(),
        &[ctx.bumps.vault],
    ];
    let signer = &[&seeds[..]];

    let cpi_accounts = anchor_spl::token::Transfer {
        from: ctx.accounts.vault_token_account.to_account_info(),
        to: ctx.accounts.user_stake_account.to_account_info(),
        authority: vault_info,
    };
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
        signer,
    );
    anchor_spl::token::transfer(cpi_ctx, amount)?;

    vault.staked_amount = vault
        .staked_amount
        .checked_sub(amount)
        .ok_or(ErrorCode::Overflow)?;

    Ok(())
}

#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct Unstake<'info> {
    #[account(
        mut,
        seeds = [b"vault", user.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, Vault>,

    #[account(
        mut,
        associated_token::mint = stake_mint,
        associated_token::authority = vault
    )]
    pub vault_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub user_stake_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub stake_mint: InterfaceAccount<'info, anchor_spl::token_interface::Mint>,

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