import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { DM_Mono, DM_Sans, Syne } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
const syne = Syne({ subsets: ['latin'], variable: '--font-syne' });
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' });
const dmMono = DM_Mono({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-dm-mono' });
export const metadata: Metadata = { title: 'EY Contract Intelligence', description: 'Contract intelligence workspace for NDA and SOW generation' };
export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) { return (<html lang="en" className={`${syne.variable} ${dmSans.variable} ${dmMono.variable}`}><body><Providers>{children}</Providers></body></html>); }
