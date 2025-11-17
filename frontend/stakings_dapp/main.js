import { PublicKey } from "@solana/web3.js";

async function main() {
    const programId = new PublicKey("6jBDgZQh6CgJFE6SvkTBHx4oUHZzF92M3d7qog7KWePz");

    const [rewardMintAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from("reward_authority")],
        programId
    );

    console.log("Reward Mint Authority:", rewardMintAuthority.toBase58());
}

main();
