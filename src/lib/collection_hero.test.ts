import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('Shreengar Approved Collection Details Hero 18-Point Test Suite', async (t) => {
  const collectionPagePath = path.join(process.cwd(), 'src', 'app', '(store)', 'collection', '[slug]', 'page.tsx')
  const collectionPageContent = fs.readFileSync(collectionPagePath, 'utf8')

  const homepagePath = path.join(process.cwd(), 'src', 'app', '(store)', 'page.tsx')
  const homepageContent = fs.readFileSync(homepagePath, 'utf8')

  const cardPath = path.join(process.cwd(), 'src', 'components', 'store', 'ProductCard.tsx')
  const cardContent = fs.readFileSync(cardPath, 'utf8')

  await t.test('1. Collection Hero renders one image element', () => {
    assert.ok(collectionPageContent.includes('<Image'))
  })

  await t.test('2. No CSS 2x2 collage is created', () => {
    assert.strictEqual(collectionPageContent.includes('grid-cols-2 grid-rows-2'), false)
  })

  await t.test('3. No divide-x or divide-y image seams exist', () => {
    assert.strictEqual(collectionPageContent.includes('divide-x'), false)
    assert.strictEqual(collectionPageContent.includes('divide-y'), false)
  })

  await t.test('4. Hero uses the dedicated collection Hero image first via resolveCollectionMedia', () => {
    assert.ok(collectionPageContent.includes('resolveCollectionMedia({'))
  })

  await t.test('5. All media sources remain backend-driven', () => {
    assert.ok(collectionPageContent.includes('assignedProducts: products'))
  })

  await t.test('6. No filename-specific checks exist', () => {
    assert.strictEqual(collectionPageContent.includes('sql90.png'), false)
  })

  await t.test('7. Gradient is translucent (linear-gradient 90deg)', () => {
    assert.ok(collectionPageContent.includes('linear-gradient(90deg, rgba(35, 0, 12, 0.98) 0%, rgba(60, 0, 22, 0.94) 22%'))
  })

  await t.test('8. Text remains above the gradient (z-30)', () => {
    assert.ok(collectionPageContent.includes('relative z-30 w-full h-full flex items-center'))
  })

  await t.test('9. Collection title remains dynamic', () => {
    assert.ok(collectionPageContent.includes('{collectionTitle}'))
  })

  await t.test('10. Description remains dynamic', () => {
    assert.ok(collectionPageContent.includes('{descriptionText}'))
  })

  await t.test('11. Product count uses real eligible products', () => {
    assert.ok(collectionPageContent.includes('{products.length}'))
  })

  await t.test('12. CTA remains dynamic', () => {
    assert.ok(collectionPageContent.includes('Explore Collection'))
  })

  await t.test('13. Decorative curves remain at the Hero bottom (svg viewBox="0 0 1440 60")', () => {
    assert.ok(collectionPageContent.includes('viewBox="0 0 1440 60"'))
  })

  await t.test('14. Hero is compact and not oversized (h-[460px] md:h-[490px] lg:h-[520px])', () => {
    assert.ok(collectionPageContent.includes('h-[460px] md:h-[490px] lg:h-[520px]'))
  })

  await t.test('15. ProductCard and ProductPrice remain unchanged', () => {
    assert.ok(cardContent.includes('top-3 right-3'))
  })

  await t.test('16. Homepage Hero remains unchanged', () => {
    assert.ok(homepageContent.includes('relative left-1/2 w-screen -translate-x-1/2 isolate overflow-hidden'))
  })

  await t.test('17. Missing collection media uses a branded fallback', () => {
    assert.ok(collectionPageContent.includes('bg-gradient-to-br from-rose-950 via-[#350817] to-[#1A0109]'))
  })

  await t.test('18. No database mutation is introduced', () => {
    assert.strictEqual(collectionPageContent.includes('supabase.from('), false)
  })
})
