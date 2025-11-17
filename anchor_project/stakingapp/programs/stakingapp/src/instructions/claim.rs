use crate::error::ErrorCode;
use crate::state::Vault;
use crate::utils::accrue_rewards;
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, MintTo, Token, TokenAccount};

pub fn handler(ctx: Context<ClaimRewards>) -> Result<()> {
    let vault = &mut ctx.accounts.vault;

    accrue_rewards(vault, &ctx.accounts.clock)?;

    let total_reward = vault.reward_debt;
    if total_reward == 0 {
        return Ok(());
    }

    let seeds = &[b"reward_authority".as_ref(), &[ctx.bumps.reward_mint_authority]];
    let signer_seeds = &[&seeds[..]];

    let cpi_accounts = MintTo {
        mint: ctx.accounts.reward_mint.to_account_info(),
        to: ctx.accounts.user_reward_account.to_account_info(),
        authority: ctx.accounts.reward_mint_authority.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
        signer_seeds,
    );

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

    /// CHECK: PDA that is mint authority
    #[account(mut, seeds = [b"reward_authority"], bump)]
    pub reward_mint_authority: UncheckedAccount<'info>,

    #[account(mut)]
    pub reward_mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = reward_mint,
        associated_token::authority = user
    )]
    pub user_reward_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub clock: Sysvar<'info, Clock>,
}