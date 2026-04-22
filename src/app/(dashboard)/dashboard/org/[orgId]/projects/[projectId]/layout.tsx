import type { ReactNode } from 'react'

import { ProjectLayout } from '@/components/layout/project-layout'

export default function OrgProjectRouteLayout({ children }: { children: ReactNode }) {
  return <ProjectLayout>{children}</ProjectLayout>
}
