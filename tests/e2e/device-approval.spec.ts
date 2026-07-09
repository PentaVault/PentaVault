import { expect, test } from '@playwright/test'

test.describe('/device CLI approval flow', () => {
  test('gates CLI approval behind an authenticated account confirmation', async ({
    page,
  }, testInfo) => {
    let authenticated = false
    await page.route('**/api/v1/auth/session', async (route) => {
      if (!authenticated) {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ code: 'UNAUTHORIZED', error: 'Unauthorized' }),
        })
        return
      }

      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          session: {
            id: 'session_mock',
            expiresAt: '2026-12-31T00:00:00.000Z',
            activeOrganizationId: 'org_mock',
            activeOrganizationSlug: 'mock-projects',
          },
          user: {
            id: 'mock-user-1',
            email: 'demo@pentavault.local',
            name: 'Demo User',
            username: 'demo',
            image: null,
            emailVerified: true,
            twoFactorEnabled: false,
            defaultOrganizationId: 'org_mock',
          },
        }),
      })
    })
    await page.route('**/api/v1/auth/organizations', async (route) => {
      if (!authenticated) {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ code: 'UNAUTHORIZED', error: 'Unauthorized' }),
        })
        return
      }

      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          organizations: [
            {
              organization: {
                id: 'org_mock',
                name: 'Mock Projects',
                slug: 'mock-projects',
                active: true,
                isDefault: true,
                defaultProjectVisibility: 'private',
                privateProjectDiscoverability: 'visible',
                membersCanSeeAllProjects: true,
                membersCanRequestProjectAccess: true,
              },
              membership: {
                id: 'org_member_mock',
                userId: 'mock-user-1',
                role: 'owner',
                memberType: 'member',
                expiresAt: null,
              },
            },
          ],
        }),
      })
    })

    await page.goto('/device')

    await expect(page.getByRole('heading', { name: 'Sign in to continue' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/login?next=%2Fdevice'
    )
    await expect(page.getByRole('link', { name: 'Create account' })).toHaveAttribute(
      'href',
      '/register?next=%2Fdevice'
    )

    authenticated = true
    await page.reload()

    await expect(page.getByRole('heading', { name: 'Continue with this account' })).toBeVisible()
    await expect(page.getByText('Demo User')).toBeVisible()

    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByRole('heading', { name: 'Approve CLI sign in' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Approve' })).toBeVisible()
    await expect(page.getByRole('button', { name: /decline/i })).toHaveCount(0)

    await page.locator('#device-code-0').fill('X')
    await page.locator('#device-code-1').fill('E')
    await page.locator('#device-code-2').fill('V')
    await page.locator('#device-code-3').fill('M')
    await page.locator('#device-code-4').fill('F')
    await page.locator('#device-code-5').fill('3')
    await expect(page.getByText('XEV-MF3')).toBeVisible()

    await testInfo.attach('device-approval-code-step', {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    })
  })
})
