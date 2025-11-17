# StakingAPP — Infinite Reward Staking dApp

**Deployed Frontend URL:** [TODO: Add your Vercel/Netlify link here]  
**Solana Program ID:** `6jBDgZQh6CgJFE6SvkTBHx4oUHZzF92M3d7qog7KWePz`

## Project Overview

### Description
StakingApp is a **fully decentralized, live-minting staking dApp** built on Solana using Anchor and React/Next.js.

Users stake a fixed SPL token and earn **infinite rewards** that are **minted on-demand** directly by the program — no pre-minted supply, no inflation schedule, pure yield magic at the end the user will earn 10% APY.

This is **real DeFi made in Nigeria** — secure, clean, and designed to print money like the Central Bank.

### Key Features
- **Live Reward Minting**: Rewards are minted fresh when claimed — no pre-mint needed
- **Any Wallet Can Claim**: First-time users auto-create their reward token account
- **Real-time Vault Info**: See staked amount and pending rewards instantly
- **Auto-refresh Dashboard**: Updates every 8 seconds like Jito/Kamino
- **Mobile-Responsive & Beautiful UI**: Green-white-green theme, smooth animations
- **Professional UX**: Error handling, loading states, confetti-ready

## How to Use the dApp

**Ask for the coin first**
    G4RNVJj14rmqDVAodXxXoPah3RRqoUsPeuXmxQRNweKt
    To be able to control the project during the timeframe this coin 
    is the only coin to be used for now... you can add from your side in the program.ts
    Stake_Mint

1. **Connect Wallet**  
   Click "Connect Wallet" (Phantom, Solflare, etc.)

2. **Stake Tokens**  
   - Enter amount of your staking token  
   - Approve & confirm transaction  
   - Your personal vault is created automatically

3. **Earn Rewards**  
   - Rewards accrue in real-time based on your stake  
   - Watch "Pending Rewards" grow live

4. **Claim Rewards**  
   - Click "Claim Rewards"  
   - First time? ATA is created automatically  
   - Fresh reward tokens are minted directly to your wallet  
   - Confetti go soon drop!

## Program Architecture

### PDA Usage

**PDAs Used:**
- `vault` → `["vault", user_pubkey]`  
  Personal staking vault for each user. Stores staked amount, last reward time, and reward debt.

- `reward_authority` → `["reward_authority"]`  
  Global PDA that has mint authority over the reward token. Only the program can sign mints using this PDA.

### Program Instructions

**Instructions Implemented:**
- `initialize_program`: Sets up global state and reward mint authority PDA
- `initialize_vault`: Creates user's vault and associated token account
- `stake`: Transfers tokens into vault and updates reward accounting
- `unstake`: Withdraws staked tokens (with reward accrual)
- `claim_rewards`: Mints pending rewards directly to user's ATA using the PDA signer

### Account Structure

```rust
#[account]
pub struct Vault {
    pub user: Pubkey,     
    pub staked_amount: u64,  
    pub last_reward_time: i64, 
    pub reward_debt: u64,     
    pub bump: u8,        
}