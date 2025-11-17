use crate::error::ErrorCode;
use crate::state::Vault;
use crate::utils::accrue_rewards;
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{TokenInterface, TokenAccount, Mint};

pub fn handler(ctx: Context<Stake>, amount: u64) -> Result<()> {
    require!(amount > 0, ErrorCode::InsufficientStake);

    let vault = &mut ctx.accounts.vault;
    accrue_rewards(vault, &ctx.accounts.clock)?;

    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_accounts = anchor_spl::token::Transfer {
        from: ctx.accounts.user_stake_account.to_account_info(),
        to: ctx.accounts.vault_token_account.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    anchor_spl::token::transfer(cpi_ctx, amount)?;

    vault.staked_amount = vault.staked_amount.checked_add(amount).ok_or(ErrorCode::Overflow)?;
    vault.last_reward_time = ctx.accounts.clock.unix_timestamp;

    Ok(())
}

#[derive(Accounts)]
pub struct Stake<'info> {
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

    pub stake_mint: InterfaceAccount<'info, Mint>,

    pub token_program: Interface<'info, TokenInterface>,
    pub clock: Sysvar<'info, Clock>,
}