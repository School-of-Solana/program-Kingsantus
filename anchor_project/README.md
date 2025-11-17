# DApp Staking Protocol — Anchor Program

**Solana Program ID:** 6FmWYQ81oXzFuMMzU2UawfcMXFuLYeLLjM6QjexbzhsW

---

## Project Overview

### Description

A **production-ready staking protocol** built with **Anchor** on **Solana**. Users stake SPL tokens to earn rewards, view real-time yield, and claim reward tokens minted on-demand via secure PDAs.

This is a **complete, secure, and stack-safe** staking program — designed for mainnet deployment.

---

### Key Features

- **Stake & Unstake** — Deposit/withdraw tokens anytime
- **Real-Time Yield** — View pending rewards without claiming
- **Claim Rewards** — Mint reward tokens via PDA authority
- **Per-User Vaults** — Isolated state using PDAs
- **Stack-Safe** — Uses `InterfaceAccount` to avoid 4096-byte overflow
- **100% Tested** — Full test suite with 6 passing tests
- **Safety Checked** — All `UncheckedAccount` documented with `/// CHECK:`

---

## Program Architecture

### PDA Usage

| PDA | Seeds | Purpose |
|-----|-------|--------|
| `global` | `["global"]` | Global config: reward rate, total staked |
| `vault` | `["vault", user_pubkey]` | Per-user staking state |
| `reward_authority` | `["reward_authority"]` | Mints reward tokens via CPI |

---

### Program Instructions

| Instruction | Description |
|-----------|-----------|
| `initialize_program` | Sets up global state and reward mint authority |
| `initialize_vault` | Creates user vault + PDA-owned token account |
| `stake` | Transfers tokens to vault, updates staked amount |
| `unstake` | Withdraws tokens, updates state |
| `get_yield` | View-only: returns total accrued rewards |
| `claim_rewards` | Mints reward tokens to user |

---

### Account Structures

```rust
#[account]
pub struct GlobalState {
    pub authority: Pubkey,
    pub reward_mint: Pubkey,
    pub reward_per_second: u64,
    pub total_staked: u64,
    pub bump: u8,
}

#[account]
pub struct Vault {
    pub user: Pubkey,
    pub staked_amount: u64,
    pub reward_debt: u64,
    pub last_reward_time: i64,
    pub bump: u8,
}


Deploying cluster: https://api.devnet.solana.com
Upgrade authority: /root/.config/solana/id.json
Deploying program "stakingapp"...
Program path: /workspace/program-Kingsantus/anchor_project/stakingapp/target/deploy/stakingapp.so...
Program Id: 6FmWYQ81oXzFuMMzU2UawfcMXFuLYeLLjM6QjexbzhsW

Signature: 3v9WMp7s4gzHExEbxxv8JuNhQ9FwaZdQous3es7FVMUZcNnPAh2ajBvQ4vj8bL9ZcHpVaiYjDr9Ngzcu3bDPjQNQ

Deploy success