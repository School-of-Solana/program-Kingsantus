"use client";
import dynamic from "next/dynamic";

// Dynamically import WalletMultiButton with ssr: false
const WalletMultiButton = dynamic(
    () => import("@solana/wallet-adapter-react-ui").then((mod) => mod.WalletMultiButton),
    { ssr: false }
);

export default function ConnectWalletButton() {
    return (
        <WalletMultiButton
            style={{
                backgroundColor: '#8B5CF6',
                borderRadius: '0.5rem',
                fontWeight: '600',
            }}
        />
    );
}
