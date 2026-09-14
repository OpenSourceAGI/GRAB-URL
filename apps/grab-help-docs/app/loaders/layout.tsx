/**
 * @file layout.tsx
 * @description Shell for the standalone loader demo pages under `/loaders`.
 * Reuses the marketing-side `HomeLayout` so a demo opened on its own — linked
 * from a README or shared directly — still gets the site nav and theme toggle
 * without the docs sidebar.
 */
import type { ReactNode } from 'react';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { baseOptions } from '@/app/layout.config';

export default function Layout({ children }: { children: ReactNode }) {
  return <HomeLayout {...baseOptions}>{children}</HomeLayout>;
}
