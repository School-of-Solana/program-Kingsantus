use crate::state::GlobalState;
use anchor_lang::prelude::*;

pub fn handler(ctx: Context<InitializeProgram>) -> Result<()> {
    let global = &mut ctx.accounts.global_state;
    global.reward_per_second = 792_744;
    global.total_staked = 0;
    global.last_update_time = Clock::get()?.unix_timestamp;
    global.reward_mint_authority_bump = ctx.bumps.reward_mint_authority;
    Ok(())
}

#[derive(Accounts)]
pub struct InitializeProgram<'info> {
    #[account(
        init,
        payer = authority,
        space = GlobalState::LEN,
        seeds = [b"global"],
        bump
    )]
    pub global_state: Account<'info, GlobalState>,

    /// CHECK: Global reward mint authority PDA
    #[account(seeds = [b"reward_authority"], bump)]
    pub reward_mint_authority: UncheckedAccount<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}