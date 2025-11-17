use anchor_lang::prelude::*;

#[account]
pub struct Vault {
    pub user: Pubkey,
    pub staked_amount: u64,
    pub last_reward_time: i64,
    pub reward_debt: u64,
    pub bump: u8,
    pub authority_set: bool,
}

#[account]
pub struct GlobalState {
    pub reward_per_second: u64,
    pub total_staked: u64,
    pub last_update_time: i64,
    pub reward_mint_authority_bump: u8,
}

impl Vault {
    pub const SPACE: usize = 8 + 32 + 8 + 8 + 8 + 1;
}

impl GlobalState {
    pub const LEN: usize = 8 + 8 + 8 + 8 + 1;
}
