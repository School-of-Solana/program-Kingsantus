// components/InitializeProgram.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface Props {
    onInit: () => Promise<void>;
    loading: boolean;
}

export default function InitializeProgram({ onInit, loading }: Props) {
    return (
        <div className="min-h-screen bg-linear-to-br from-purple-900 to-blue-900 flex items-center justify-center p-4">
            <Card className="p-8 max-w-md w-full">
                <h2 className="text-2xl font-bold mb-4 text-white">Initialize Protocol</h2>
                <p className="text-sm text-gray-300 mb-6">Run once by admin</p>
                <Button onClick={onInit} disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Initialize Program"}
                </Button>
            </Card>
        </div>
    );
}