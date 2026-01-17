import { NextRequest, NextResponse } from "next/server";
import { getSaltClient } from "@/salt/client";

// GET /api/salt/accounts - List available accounts
export async function GET() {
    try {
        const client = getSaltClient();

        // Ensure authenticated
        if (!client.getIsAuthenticated()) {
            await client.authenticate();
        }

        // Get organizations
        const orgs = await client.getOrganisations();
        if (!orgs.length) {
            return NextResponse.json(
                { success: false, error: "No organisations found" },
                { status: 404 }
            );
        }

        // Get accounts from first org (or could be configured)
        // Find an org with accounts
        let accounts: any[] = [];
        let orgId = '';
        let orgName = '';

        for (const org of orgs) {
            const orgAccounts = await client.getAccounts(org._id);
            if (orgAccounts.length > 0) {
                accounts = orgAccounts;
                orgId = org._id;
                orgName = org.name;
                break;
            }
        }

        // If no accounts found in any org, default to first org info (empty)
        if (accounts.length === 0 && orgs.length > 0) {
            orgId = orgs[0]._id;
            orgName = orgs[0].name;
            accounts = [];
        }

        return NextResponse.json({
            success: true,
            orgId,
            orgName,
            accounts,
            totalOrgs: orgs.length,
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to fetch accounts";
        return NextResponse.json(
            { success: false, error: errorMessage },
            { status: 500 }
        );
    }
}

// POST /api/salt/accounts - Select active account
export async function POST(request: NextRequest) {
    try {
        const { accountId } = await request.json();

        if (!accountId) {
            return NextResponse.json(
                { success: false, error: "accountId is required" },
                { status: 400 }
            );
        }

        const client = getSaltClient();
        client.setActiveAccount(accountId);

        return NextResponse.json({
            success: true,
            activeAccountId: accountId,
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to select account";
        return NextResponse.json(
            { success: false, error: errorMessage },
            { status: 500 }
        );
    }
}
