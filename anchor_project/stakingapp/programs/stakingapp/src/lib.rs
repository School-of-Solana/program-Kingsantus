use anchor_lang::prelude::*;

declare_id!("6FmWYQ81oXzFuMMzU2UawfcMXFuLYeLLjM6QjexbzhsW");


pub mod error;
pub mod state;
pub mod instructions;

pub use crate::error::*;
pub use crate::state::*;
pub use crate::instructions::*;

#[program]
pub mod stakingapp {
    use super::*;

    pub fn initialize_vault(ctx: Context<InitializeVault>) -> Result<()> {
        instructions::initialize::handler(ctx)
    }

    pub fn initialize_program(ctx: Context<InitializeProgram>) -> Result<()> {
        instructions::initialize_program::handler(ctx)
    }

    pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
        instructions::stake::handler(ctx, amount)
    }

    pub fn unstake(ctx: Context<Unstake>, amount: u64) -> Result<()> {
        instructions::unstake::handler(ctx, amount)
    }
    

    pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
        instructions::claim::handler(ctx)
    }

    pub fn get_yield(ctx: Context<GetYield>) -> Result<u64> {
        instructions::get_yield::handler(ctx)
    }

    pub fn set_vault_authority(ctx: Context<SetVaultAuthority>) -> Result<()> {
        instructions::set_vault_authority::handler(ctx)
    }
}
