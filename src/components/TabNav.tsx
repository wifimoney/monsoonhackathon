'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
    { name: 'Onboard', href: '/onboard' },
    { name: 'Trade', href: '/trade' },
    { name: 'Agent', href: '/agent' },
    { name: 'Vault', href: '/vault' },
    { name: 'Orderbook', href: '/orderbook' },
    { name: 'Pear', href: '/pear' },
    { name: 'Guardians', href: '/guardians' },
    { name: 'Audit', href: '/audit' },
];

export function TabNav() {
    const pathname = usePathname();

    return (
        <nav className="tab-nav">
            {tabs.map((tab) => (
                <Link
                    key={tab.href}
                    href={tab.href}
                    className={`tab-link ${pathname === tab.href ? 'active' : ''}`}
                >
                    {tab.name}
                </Link>
            ))}
        </nav>
    );
}
