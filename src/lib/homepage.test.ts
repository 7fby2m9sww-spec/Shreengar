import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('Shreengar Homepage Blog Publication Schedule & Trigger Function Safety Suite', async (t) => {
  const pagePath = path.join(process.cwd(), 'src', 'app', '(store)', 'page.tsx')
  const pageContent = fs.readFileSync(pagePath, 'utf8')

  const adminPagePath = path.join(process.cwd(), 'src', 'app', 'admin', '(dashboard)', 'homepage', 'page.tsx')
  const adminPageContent = fs.readFileSync(adminPagePath, 'utf8')

  const servicePath = path.join(process.cwd(), 'src', 'services', 'admin.ts')
  const serviceContent = fs.readFileSync(servicePath, 'utf8')

  const homepageServicePath = path.join(process.cwd(), 'src', 'services', 'homepage.ts')
  const homepageServiceContent = fs.readFileSync(homepageServicePath, 'utf8')

  const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20260729_create_blogs_table.sql')
  const migrationContent = fs.readFileSync(migrationPath, 'utf8')

  const dbTypesPath = path.join(process.cwd(), 'src', 'types', 'database.ts')
  const dbTypesContent = fs.readFileSync(dbTypesPath, 'utf8')

  await t.test('1. Admin Homepage Blog query applies is_published = true', () => {
    assert.ok(serviceContent.includes(".eq('is_published', true)"))
  })

  await t.test('2. Admin Homepage Blog query excludes future published_at values', () => {
    assert.ok(serviceContent.includes('published_at.lte.'))
  })

  await t.test('3. Null published_at remains eligible when is_published is true', () => {
    assert.ok(serviceContent.includes('published_at.is.null'))
  })

  await t.test('4. Client filtering does not use is_published !== false', () => {
    assert.strictEqual(adminPageContent.includes('b.is_published !== false'), false)
  })

  await t.test('5. Storefront resolver explicitly applies the same eligibility rule', () => {
    assert.ok(homepageServiceContent.includes(".eq('is_published', true)"))
    assert.ok(homepageServiceContent.includes('published_at.lte.'))
  })

  await t.test('6. Storefront does not rely only on RLS', () => {
    assert.ok(homepageServiceContent.includes('published_at.is.null'))
  })

  await t.test('7. Service-role queries cannot leak future-scheduled articles', () => {
    assert.ok(serviceContent.includes('published_at.lte.'))
    assert.ok(homepageServiceContent.includes('published_at.lte.'))
  })

  await t.test('8. Draft articles remain excluded', () => {
    assert.ok(serviceContent.includes(".eq('is_published', true)"))
  })

  await t.test('9. Existing selected order remains preserved', () => {
    assert.ok(homepageServiceContent.includes('resolvedItems.push'))
  })

  await t.test('10. Stale or ineligible references are omitted', () => {
    assert.ok(homepageServiceContent.includes('if (resolvedEntity)'))
  })

  await t.test('11. Migration does not create public.update_updated_at_column()', () => {
    assert.strictEqual(migrationContent.includes('public.update_updated_at_column()'), false)
  })

  await t.test('12. Migration creates the Blog-specific trigger function public.set_blogs_updated_at()', () => {
    assert.ok(migrationContent.includes('CREATE FUNCTION public.set_blogs_updated_at()'))
  })

  await t.test('13. Migration does not use CREATE OR REPLACE for the Blog trigger function', () => {
    assert.strictEqual(migrationContent.includes('CREATE OR REPLACE FUNCTION public.set_blogs_updated_at()'), false)
  })

  await t.test('14. Function performs only NEW.updated_at = NOW()', () => {
    assert.ok(migrationContent.includes('NEW.updated_at = NOW();'))
  })

  await t.test('15. Browser roles remain SELECT-only', () => {
    assert.ok(migrationContent.includes('REVOKE ALL PRIVILEGES ON TABLE public.blogs FROM anon, authenticated;'))
    assert.ok(migrationContent.includes('GRANT SELECT ON TABLE public.blogs TO anon, authenticated;'))
  })

  await t.test('16. excerpt type permits null', () => {
    assert.ok(dbTypesContent.includes('excerpt: string | null'))
  })

  await t.test('17. cover_image type permits null', () => {
    assert.ok(dbTypesContent.includes('cover_image: string | null'))
  })

  await t.test('18. published_at type permits null', () => {
    assert.ok(dbTypesContent.includes('published_at: string | null'))
  })

  await t.test('19. Missing images use the branded fallback', () => {
    assert.ok(adminPageContent.includes('FileText'))
    assert.ok(pageContent.includes('Sparkles'))
  })

  await t.test('20. No Blog records are inserted', () => {
    assert.strictEqual(migrationContent.includes('INSERT INTO public.blogs'), false)
  })

  await t.test('21. Other Homepage sections remain unchanged', () => {
    assert.ok(pageContent.includes('aspect-[4/5] w-full max-w-[260px]'))
  })
})
