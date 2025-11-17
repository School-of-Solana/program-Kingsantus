use anchor_lang::prelude::*;
use anchor_spl::token::{SetAuthority, TokenAccount};
use anchor_spl::token::spl_token::instruction::AuthorityType;
use crate::state::Vault;
use crate::error::ErrorCode;

#[derive(Accounts)]
pub struct SetVaultAuthority<'info> {
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"vault", vault.user.as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, Vault>,

    #[account(
        mut,
        constraint = authority.key() == vault.user @ ErrorCode::Unauthorized
    )]
    pub authority: Signer<'info>,

    pub token_program: Program<'info, anchor_spl::token::Token>,
}

pub fn handler(ctx: Context<SetVaultAuthority>) -> Result<()> {
    if ctx.accounts.vault.authority_set {
        return Err(ErrorCode::AlreadySet.into());
    }

    let cpi_accounts = SetAuthority {
        account_or_mint: ctx.accounts.vault_token_account.to_account_info(),
        current_authority: ctx.accounts.authority.to_account_info(),
    };

    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
    );

    anchor_spl::token::set_authority(
        cpi_ctx,
        AuthorityType::AccountOwner,
        Some(ctx.accounts.vault.key()),
    )?;

    ctx.accounts.vault.authority_set = true;
    Ok(())
}