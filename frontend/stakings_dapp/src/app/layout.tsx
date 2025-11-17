import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@solana/wallet-adapter-react-ui/styles.css";
import SolanaWalletProvider from "./components/WalletProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Solana Staking DApp",
  description: "A Solana Staking DApp that reward user for their money",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.className} ${geistMono.className}`}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning={true}>
        <SolanaWalletProvider autoConnect={true}>
          {children}
        </SolanaWalletProvider>
      </body>
    </html>
  );
}