import test from 'node:test'
import assert from 'node:assert/strict'
import { getAccountNavigation } from './accountNavigation.ts'

test('Account Directory Role-Aware Navigation Test Suite', async (t) => {
  await t.test('1. Customer role resolves complete customer navigation items', () => {
    const nav = getAccountNavigation('customer')
    const labels = nav.map(item => item.label)
    const hrefs = nav.map(item => item.href)

    assert.deepEqual(labels, [
      'My Account',
      'My Orders',
      'Wishlist',
      'Addresses',
      'Settings'
    ])
    assert.deepEqual(hrefs, [
      '/account',
      '/orders',
      '/wishlist',
      '/addresses',
      '/settings'
    ])
  })

  await t.test('2. Admin role resolves admin navigation items (excluding customer orders/wishlists)', () => {
    const nav = getAccountNavigation('admin')
    const labels = nav.map(item => item.label)
    const hrefs = nav.map(item => item.href)

    assert.deepEqual(labels, [
      'Admin Panel',
      'Settings'
    ])
    assert.deepEqual(hrefs, [
      '/admin/dashboard',
      '/settings'
    ])
  })

  await t.test('3. Unknown or missing role defaults to customer navigation (secure fallback)', () => {
    const nav = getAccountNavigation('unknown_role')
    const labels = nav.map(item => item.label)

    assert.ok(!labels.includes('Admin Panel'), 'Unknown role must NOT receive administrative dashboard access')
    assert.ok(labels.includes('My Orders'), 'Unknown role falls back to customer navigation')
  })

  await t.test('4. Empty/undefined role defaults to customer navigation', () => {
    const nav = getAccountNavigation(undefined)
    const labels = nav.map(item => item.label)

    assert.ok(!labels.includes('Admin Panel'), 'Empty/undefined role must NOT receive administrative dashboard access')
    assert.ok(labels.includes('My Orders'), 'Empty/undefined role falls back to customer navigation')
  })
})
