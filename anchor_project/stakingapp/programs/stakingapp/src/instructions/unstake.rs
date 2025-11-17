use crate::error::ErrorCode;
use crate::state::Vault;
use crate::utils::accrue_rewards;
use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Transfer};

pub fn handler(ctx: Context<Unstake>, amount: u64) -> Result<()> {
    require!(amount > 0, ErrorCode::InsufficientStake);
    require!(ctx.accounts.vault.staked_amount >= amount, ErrorCode::InsufficientStake);

    let vault = &mut ctx.accounts.vault;
    accrue_rewards(vault, &ctx.accounts.clock)?;

    let user_key = ctx.accounts.user.key();

    let vault_seeds = &[
        b"vault".as_ref(),
        user_key.as_ref(),
        &[ctx.bumps.vault],
    ];
    let signer_seeds = &[&vault_seeds[..]];

    let vault_authority = vault.to_account_info();

    let cpi_accounts = Transfer {
        from: ctx.accounts.vault_token_account.to_account_info(),
        to: ctx.accounts.user_stake_account.to_account_info(),
        authority: vault_authority.clone(),
    };
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
        signer_seeds,
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
    pub vault_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_stake_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub stake_mint: Account<'info, anchor_spl::token::Mint>,

    pub token_program: Program<'info, Token>,

    pub clock: Sysvar<'info, Clock>,
}