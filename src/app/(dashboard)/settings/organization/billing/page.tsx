'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function OrgBillingPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-lg font-semibold">Billing</h2>
        <p className="text-sm text-muted-foreground">
          Manage your organisation&apos;s subscription and billing details.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current plan</CardTitle>
          <CardDescription>Your organisation is currently on the free plan.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Free</p>
            <p className="mt-1 text-xs text-muted-foreground">1 of 1 seats used</p>
          </div>
          <Button disabled size="sm" type="button" variant="outline">
            Upgrade plan
          </Button>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Billing integration is coming soon. Contact support for enterprise pricing.
      </p>
    </div>
  )
}
