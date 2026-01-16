import { NextResponse } from "next/server";
import { salt, getOrganizations, getAccounts } from "@/salt";
import { getSigner, validateNetworkConfig, AGENT, BROADCASTING_NETWORK_ID } from "@/salt/config";

export async function GET() {
    try {
        // Try to validate configuration
        let configValid = false;
        let configError = "";

        try {
            await validateNetworkConfig();
            configValid = true;
        } catch (error) {
            configError = error instanceof Error ? error.message : String(error);
        }

        // Check if signer is configured
        let signerAddress = "";
        let signerError = "";

        try {
            const signer = getSigner();
            signerAddress = await signer.getAddress();
        } catch (error) {
            signerError = error instanceof Error ? error.message : String(error);
        }

        // Get organizations if authenticated
        let organizations: Array<{ _id: string; name: string }> = [];
        let orgsError = "";

        if (signerAddress) {
            try {
                const signer = getSigner();
                await salt.authenticate(signer);
                organizations = await getOrganizations();
            } catch (error) {
                orgsError = error instanceof Error ? error.message : String(error);
            }
        }

        return NextResponse.json({
            status: "ok",
            config: {
                valid: configValid,
                error: configError,
                broadcastingNetworkId: BROADCASTING_NETWORK_ID,
                agent: AGENT || "interactive",
            },
            signer: {
                address: signerAddress,
                error: signerError,
            },
            organizations: {
                count: organizations.length,
                list: organizations,
                error: orgsError,
            },
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return NextResponse.json(
            { status: "error", error: errorMessage },
            { status: 500 }
        );
    }
}
