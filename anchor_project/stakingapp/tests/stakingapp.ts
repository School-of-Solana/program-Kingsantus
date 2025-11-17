import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Stakingapp } from "../target/types/stakingapp";
import {
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  createAssociatedTokenAccount,
  getAssociatedTokenAddress,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { assert } from "chai";

describe("stakingapp", () => {
   const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.DApp as Program<DApp>;

  // PDAs
  let globalStatePda: PublicKey;
  let rewardMintAuthorityPda: PublicKey;
  let vaultPda: PublicKey;
  let vaultBump: number;

  // Mints
  let stakeMint: PublicKey;
  let rewardMint: PublicKey;

  // Token Accounts
  let userStakeAta: PublicKey;
  let vaultStakeAta: PublicKey;
  let userRewardAta: PublicKey;

  // Users
  const user = provider.wallet;
  const authority = user;

  before(async () => {
    // Derive PDAs
    [globalStatePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("global")],
      program.programId
    );

    [rewardMintAuthorityPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("reward_auth"), user.publicKey.toBuffer()],
      program.programId
    );

    [vaultPda, vaultBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), user.publicKey.toBuffer()],
      program.programId
    );

    // Create stake mint
    stakeMint = await createMint(
      provider.connection,
      user.payer,
      user.publicKey,
      null,
      6
    );

    // Create reward mint (minted by PDA)
    rewardMint = await createMint(
      provider.connection,
      user.payer,
      rewardMintAuthorityPda,
      null,
      6
    );

    // Create ATAs
    userStakeAta = await getAssociatedTokenAddress(stakeMint, user.publicKey);
    vaultStakeAta = await getAssociatedTokenAddress(stakeMint, vaultPda);
    userRewardAta = await getAssociatedTokenAddress(rewardMint, user.publicKey);

    await Promise.all([
      createAssociatedTokenAccount(provider.connection, user.payer, stakeMint, user.publicKey),
      createAssociatedTokenAccount(provider.connection, user.payer, stakeMint, vaultPda, true),
      createAssociatedTokenAccount(provider.connection, user.payer, rewardMint, user.publicKey),
    ]);

    // Mint initial stake tokens to user
    await mintTo(
      provider.connection,
      user.payer,
      stakeMint,
      userStakeAta,
      user.publicKey,
      1000_000_000
    );
  });

  it("Initializes the program", async () => {
    const tx = await program.methods
      .initializeProgram()
      .accounts({
        globalState: globalStatePda,
        rewardMintAuthority: rewardMintAuthorityPda,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const globalState = await program.account.globalState.fetch(globalStatePda);
    assert.equal(globalState.rewardPerSecond.toString(), "1000000000000");
    assert.equal(globalState.totalStaked.toNumber(), 0);
  });

  it("Initializes user vault", async () => {
    await program.methods
      .initializeVault()
      .accounts({
        vault: vaultPda,
        vaultTokenAccount: vaultStakeAta,
        user: user.publicKey,
        stakeMint: stakeMint,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      })
      .rpc();

    const vault = await program.account.vault.fetch(vaultPda);
    assert.equal(vault.user.toBase58(), user.publicKey.toBase58());
    assert.equal(vault.stakedAmount.toNumber(), 0);
    assert.equal(vault.rewardDebt.toNumber(), 0);
    assert.isFalse(vault.authoritySet);
  });

  it("Stakes tokens", async () => {
    const amount = 100_000_000; // 100 tokens

    await program.methods
      .stake(new anchor.BN(amount))
      .accounts({
        vault: vaultPda,
        vaultTokenAccount: vaultStakeAta,
        userStakeAccount: userStakeAta,
        user: user.publicKey,
        stakeMint: stakeMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      })
      .rpc();

    const vault = await program.account.vault.fetch(vaultPda);
    assert.equal(vault.stakedAmount.toNumber(), amount);

    const vaultTokenAcc = await getAccount(provider.connection, vaultStakeAta);
    assert.equal(vaultTokenAcc.amount.toString(), amount.toString());
  });

  it("Accrues rewards over time", async () => {
    // Advance clock by 1 year
    const clock = await provider.connection.getAccountInfo(anchor.web3.SYSVAR_CLOCK_PUBKEY);
    const clockData = Clock.fromBuffer(clock.data);
    const futureTime = clockData.unixTimestamp + 365 * 24 * 60 * 60;

    await provider.connection.sendRawTransaction(
      new anchor.web3.Transaction()
        .add(
          anchor.web3.SystemProgram.incrementClock({
            clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
            unixTimestamp: new anchor.BN(futureTime),
          })
        )
        .compileMessage()
        .serialize(),
      { skipPreflight: true }
    );

    // Call get_yield to trigger accrue
    const yieldAmount = await program.methods
      .getYield()
      .accounts({
        vault: vaultPda,
        user: user.publicKey,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      })
      .view();

    const expected = 10_000_000; // 100 * 10% = 10 tokens
    assert.equal(yieldAmount.toNumber(), expected);

    const vault = await program.account.vault.fetch(vaultPda);
    assert.equal(vault.rewardDebt.toNumber(), expected);
  });

  it("Claims rewards", async () => {
    const beforeBalance = await provider.connection.getTokenAccountBalance(userRewardAta);

    await program.methods
      .claimRewards()
      .accounts({
        vault: vaultPda,
        rewardMintAuthority: rewardMintAuthorityPda,
        rewardMint: rewardMint,
        userRewardAccount: userRewardAta,
        user: user.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      })
      .rpc();

    const afterBalance = await provider.connection.getTokenAccountBalance(userRewardAta);
    const claimed = Number(afterBalance.value.amount) - Number(beforeBalance.value.amount);
    assert.equal(claimed, 10_000_000); // 10 tokens

    const vault = await program.account.vault.fetch(vaultPda);
    assert.equal(vault.rewardDebt.toNumber(), 0);
  });

  it("Unstakes tokens", async () => {
    const amount = 50_000_000;

    await program.methods
      .unstake(new anchor.BN(amount))
      .accounts({
        vault: vaultPda,
        vaultTokenAccount: vaultStakeAta,
        userStakeAccount: userStakeAta,
        user: user.publicKey,
        stakeMint: stakeMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      })
      .rpc();

    const vault = await program.account.vault.fetch(vaultPda);
    assert.equal(vault.stakedAmount.toNumber(), 50_000_000); // 100M - 50M
  });

  it("Sets vault authority", async () => {
    await program.methods
      .setVaultAuthority()
      .accounts({
        vaultTokenAccount: vaultStakeAta,
        vault: vaultPda,
        authority: user.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const vault = await program.account.vault.fetch(vaultPda);
    assert.isTrue(vault.authoritySet);

    const tokenAcc = await getAccount(provider.connection, vaultStakeAta);
    assert.equal(tokenAcc.owner.toBase58(), vaultPda.toBase58());
  });

  it("Rejects setting authority twice", async () => {
    let error;
    try {
      await program.methods
        .setVaultAuthority()
        .accounts({
          vaultTokenAccount: vaultStakeAta,
          vault: vaultPda,
          authority: user.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      assert.fail("Should have thrown");
    } catch (err) {
      error = err;
    }
    assert.include(error.message, "AlreadySet");
  });

  it("Rejects zero stake", async () => {
    let error;
    try {
      await program.methods
        .stake(new anchor.BN(0))
        .accounts({
          vault: vaultPda,
          vaultTokenAccount: vaultStakeAta,
          userStakeAccount: userStakeAta,
          user: user.publicKey,
          stakeMint: stakeMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        })
        .rpc();
      assert.fail("Should have thrown");
    } catch (err) {
      error = err;
    }
    assert.include(error.message, "InsufficientStake");
  });
});