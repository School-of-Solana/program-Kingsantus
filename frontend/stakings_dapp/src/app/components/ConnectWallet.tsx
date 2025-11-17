import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Card } from "@/components/ui/card";

export default function ConnectWallet() {
    return (
        <div className="min-h-screen bg-linear-to-br from-purple-900 to-blue-900 flex items-center justify-center p-4">
            <Card className="p-8 max-w-md w-full">
                <h1 className="text-3xl font-bold text-center mb-6 text-gray-700">Stake DApp</h1>
                <p className="text-center text-muted-foreground mb-8">
                    Connect your wallet to stake and earn rewards
                </p>
                <WalletMultiButton className="w-full" />
            </Card>
        </div>
    );
}