import { NextRequest, NextResponse } from "next/server";
import { getSaltClient } from "@/salt/client";

// POST /api/salt/transfer - Execute a transfer through Salt
export async function POST(request: NextRequest) {
    try {
        const { to, token, amount, accountId: providedAccountId } = await request.json();

        const client = getSaltClient();
        const accountId = providedAccountId || client.getActiveAccountId();

        if (!accountId) {
            return NextResponse.json(
                { success: false, error: "No Salt account selected" },
                { status: 400 }
            );
        }

        if (!to || !amount) {
            return NextResponse.json(
                { success: false, error: "Missing required fields: to, amount" },
                { status: 400 }
            );
        }

        // Ensure authenticated
        if (!client.getIsAuthenticated()) {
            await client.authenticate();
        }

        const result = await client.transfer({
            accountId,
            to,
            token: token || "ETH",
            amount: String(amount),
        });

        // Check for policy denial
        if (result.policyBreach?.denied) {
            return NextResponse.json({
                success: false,
                denied: true,
                policyBreach: result.policyBreach,
                message: `Blocked by policy: ${result.policyBreach.reason}`,
                logs: result.logs,
            }, { status: 403 });
        }

        return NextResponse.json({
            success: result.success,
            txHash: result.txHash,
            status: result.status,
            logs: result.logs,
        });
    } catch (error: any) {
        // Salt SDK might throw on policy denial - handle gracefully
        if (error.policyBreach || error.code === "POLICY_DENIED" || error.type === "PolicyDenied") {
            return NextResponse.json({
                success: false,
                denied: true,
                policyBreach: {
                    denied: true,
                    reason: error.reason || error.message,
                    rule: error.rule || error.violatedRule || "unknown",
                    details: error.details,
                },
            }, { status: 403 });
        }

        const errorMessage = error instanceof Error ? error.message : "Transfer failed";
        return NextResponse.json(
            { success: false, error: errorMessage },
            { status: 500 }
        );
    }
}
