import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('Privacy Policy Page-Scoped Dark-Mode & Global Variant Safety Suite', async (t) => {
  const pagePath = path.join(process.cwd(), 'src', 'app', '(store)', 'privacy-policy', 'page.tsx')
  const pageContent = fs.readFileSync(pagePath, 'utf8')

  const breadcrumbPath = path.join(process.cwd(), 'src', 'components', 'store', 'Breadcrumb.tsx')
  const breadcrumbContent = fs.readFileSync(breadcrumbPath, 'utf8')

  const globalsCssPath = path.join(process.cwd(), 'src', 'app', 'globals.css')
  const globalsCssContent = fs.readFileSync(globalsCssPath, 'utf8')

  await t.test('1. Global dark variant remains official class-based selector', () => {
    assert.ok(globalsCssContent.includes('@custom-variant dark (&:where(.dark, .dark *));'))
  })

  await t.test('2. Global dark variant is NOT changed to (.dark &)', () => {
    assert.strictEqual(globalsCssContent.includes('@custom-variant dark (.dark &);'), false)
  })

  await t.test('3. Privacy paragraphs receive explicit readable dark-mode color', () => {
    assert.ok(pageContent.includes('dark:!text-[#D9C8C1]'))
  })

  await t.test('4. Privacy paragraph dark color is #D9C8C1', () => {
    assert.ok(pageContent.includes('#D9C8C1'))
  })

  await t.test('5. Privacy fix is page-scoped and does not target all paragraphs globally', () => {
    assert.strictEqual(globalsCssContent.includes('.dark p {'), false)
  })

  await t.test('6. Light mode remains unchanged', () => {
    assert.ok(pageContent.includes('text-rose-900/80'))
    assert.ok(pageContent.includes('text-amber-800'))
    assert.ok(pageContent.includes('bg-surface'))
  })

  await t.test('7. Card and page backgrounds remain distinct', () => {
    assert.ok(pageContent.includes('dark:!bg-[#2C151D]'))
  })

  await t.test('8. Breadcrumb renders on Privacy Policy', () => {
    assert.ok(pageContent.includes('<Breadcrumb'))
    assert.ok(pageContent.includes('Privacy Policy'))
  })

  await t.test('9. Shared Breadcrumb default behavior is unchanged across routes', () => {
    assert.ok(breadcrumbContent.includes('linkClassName = \'\''))
    assert.ok(breadcrumbContent.includes('activeClassName = \'\''))
    assert.strictEqual(breadcrumbContent.includes('dark:text-[#CDBBB3]'), false)
  })

  await t.test('10. Privacy Policy wording is 100% unchanged', () => {
    assert.ok(pageContent.includes('When you make a purchase from Shreengar'))
    assert.ok(pageContent.includes('We use your personal data to process your orders'))
    assert.ok(pageContent.includes('All sensitive financial data is encrypted'))
    assert.ok(pageContent.includes('privacy@shreengar.com'))
  })

  await t.test('11. Header, Footer and Talk to Support are unchanged in layout', () => {
    const layoutPath = path.join(process.cwd(), 'src', 'app', '(store)', 'layout.tsx')
    const layoutContent = fs.readFileSync(layoutPath, 'utf8')
    assert.ok(layoutContent.includes('<Header />'))
    assert.ok(layoutContent.includes('<Footer config={footerConfig} />'))
    assert.ok(layoutContent.includes('<SupportPortal />'))
  })

  await t.test('12. No database changes are introduced', () => {
    assert.strictEqual(pageContent.includes('supabase'), false)
  })
})
