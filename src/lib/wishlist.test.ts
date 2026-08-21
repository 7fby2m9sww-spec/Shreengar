import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('Wishlist Database Mapping & Route Integrity Test Suite', async (t) => {
  const actionsPath = path.join(process.cwd(), 'src', 'actions', 'wishlist', 'actions.ts')
  const storeServicePath = path.join(process.cwd(), 'src', 'services', 'store.ts')
  const adminProductServicePath = path.join(process.cwd(), 'src', 'services', 'admin', 'products.ts')

  assert.ok(fs.existsSync(actionsPath), 'Wishlist actions.ts must exist')
  assert.ok(fs.existsSync(storeServicePath), 'Store service store.ts must exist')
  assert.ok(fs.existsSync(adminProductServicePath), 'Admin products.ts must exist')

  const actionsContent = fs.readFileSync(actionsPath, 'utf8')
  const storeServiceContent = fs.readFileSync(storeServicePath, 'utf8')
  const adminProductServiceContent = fs.readFileSync(adminProductServicePath, 'utf8')

  await t.test('1. checkWishlistStatusAction maps to variant_id column', () => {
    assert.ok(
      actionsContent.includes(".from('product_variants')") &&
      actionsContent.includes(".eq('product_id', productId)") &&
      actionsContent.includes(".from('wishlist')") &&
      actionsContent.includes(".in('variant_id', variantIds)"),
      'checkWishlistStatusAction must query product_variants first and check wishlist using variant_id'
    )
  })

  await t.test('2. toggleWishlistAction inserts and deletes using variant_id column', () => {
    assert.ok(
      actionsContent.includes(".from('wishlist')") &&
      actionsContent.includes(".in('variant_id', variantIds)") &&
      actionsContent.includes("variant_id: variants[0].id"),
      'toggleWishlistAction must check, insert, and delete using variant_id column'
    )
  })

  await t.test('3. getWishlistForUser queries wishlist with nested variant-product join', () => {
    assert.ok(
      storeServiceContent.includes(".from('wishlist')") &&
      storeServiceContent.includes(".select('id, variant:product_variants(id, product:products(*))')"),
      'getWishlistForUser must query wishlist using nested join of variant and product'
    )
  })

  await t.test('4. Product deletion cleans up wishlist by variant_id', () => {
    assert.ok(
      adminProductServiceContent.includes("await supabase.from('wishlist').delete().in('variant_id', variantIds)"),
      'Admin products.ts delete function must clean up wishlist using variant_id'
    )
  })
})
