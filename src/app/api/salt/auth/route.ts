import { NextResponse } from "next/server";
import { getSaltClient } from "@/salt/client";

export async function POST() {
    try {
        const client = getSaltClient();
        const result = await client.authenticate();

        return NextResponse.json({
            success: true,
            authenticated: true,
            address: result.address,
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Auth failed";
        return NextResponse.json(
            { success: false, error: errorMessage },
            { status: 500 }
        );
    }
}
