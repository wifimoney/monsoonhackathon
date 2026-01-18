'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
    { name: 'Agent', href: '/dashboard/agent' },
    { name: 'Portfolio', href: '/portfolio' },
    { name: 'Dashboard', href: '/dashboard' },
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
