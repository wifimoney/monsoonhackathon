import { NextRequest, NextResponse } from "next/server";
import { salt, sendTransaction } from "@/salt";
import { getSigner } from "@/salt/config";
import { ethers } from "ethers";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { accountId, recipient, value, data, strategy } = body;

        if (!accountId || !recipient || !value) {
            return NextResponse.json(
                { error: "Missing required fields: accountId, recipient, value" },
                { status: 400 }
            );
        }

        const logs: string[] = [];
        const result = await sendTransaction({
            accountId,
            recipient,
            value: ethers.utils.parseEther(String(value)),
            data,
            onLog: (msg, type) => {
                logs.push(`[${type.toUpperCase()}] ${msg}`);
            },
        });

        return NextResponse.json({
            success: result.success,
            transactionHash: result.transactionHash,
            error: result.error,
            logs: result.logs,
            strategy,
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return NextResponse.json(
            { error: errorMessage, success: false },
            { status: 500 }
        );
    }
}
