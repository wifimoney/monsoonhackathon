'use client';

import { useAccount } from 'wagmi';
import { LiFiWidget, WidgetConfig } from '@lifi/widget';

const widgetConfig: WidgetConfig = {
    integrator: "salt-autofi",
    variant: "wide",
    appearance: "dark",
    theme: {
        colorSchemes: {
            light: {
                palette: {
                    primary: {
                        main: "#5C67FF"
                    },
                    secondary: {
                        main: "#F7C2FF"
                    }
                }
            },
            dark: {
                palette: {
                    primary: {
                        main: "#5C67FF"
                    },
                    secondary: {
                        main: "#F7C2FF"
                    }
                }
            }
        },
        typography: {
            fontFamily: "Inter, sans-serif"
        },
        container: {
            boxShadow: "0px 8px 32px rgba(0, 0, 0, 0.08)",
            borderRadius: "16px"
        }
    }
};

export function DepositFunds() {
    const { isConnected } = useAccount();

    if (!isConnected) {
        return (
            <div className="card text-center py-8">
                <div className="text-4xl mb-3">💰</div>
                <h3 className="text-xl font-bold mb-2">Deposit Funds</h3>
                <p className="text-[var(--muted)]">
                    Connect your wallet to deposit funds
                </p>
            </div>
        );
    }

    return (
        <LiFiWidget integrator="salt-autofi" config={widgetConfig} />
    );
}
