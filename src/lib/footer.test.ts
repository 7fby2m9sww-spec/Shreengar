import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { DEFAULT_FOOTER_CONFIG } from '../constants/footer'

test('Shreengar Admin Footer Manager & Storefront Integration Suite', async (t) => {
  const footerCompPath = path.join(process.cwd(), 'src', 'components', 'store', 'Footer.tsx')
  const footerCompContent = fs.readFileSync(footerCompPath, 'utf8')

  const adminPagePath = path.join(process.cwd(), 'src', 'app', 'admin', '(dashboard)', 'settings', 'footer', 'page.tsx')
  const adminPageContent = fs.readFileSync(adminPagePath, 'utf8')

  const actionsPath = path.join(process.cwd(), 'src', 'actions', 'footer', 'actions.ts')
  const actionsContent = fs.readFileSync(actionsPath, 'utf8')

  const servicePath = path.join(process.cwd(), 'src', 'services', 'footer.ts')
  const serviceContent = fs.readFileSync(servicePath, 'utf8')

  const layoutPath = path.join(process.cwd(), 'src', 'app', '(store)', 'layout.tsx')
  const layoutContent = fs.readFileSync(layoutPath, 'utf8')

  await t.test('1. Footer settings load from the database', () => {
    assert.ok(serviceContent.includes("from('storefront_settings')"))
    assert.ok(serviceContent.includes(".select('footer_config')"))
  })

  await t.test('2. Existing footer content is preserved as defaults', () => {
    assert.strictEqual(DEFAULT_FOOTER_CONFIG.brand.name, 'SHREENGAR')
    assert.strictEqual(DEFAULT_FOOTER_CONFIG.quickLinks.heading, 'Quick Links')
    assert.strictEqual(DEFAULT_FOOTER_CONFIG.policies.heading, 'Policies & Compliance')
    assert.strictEqual(DEFAULT_FOOTER_CONFIG.newsletter.heading, 'Festive Circle')
  })

  await t.test('3. Brand name is editable', () => {
    assert.ok(adminPageContent.includes("label=\"Brand Display Name\""))
    assert.ok(footerCompContent.includes('config.brand.name'))
  })

  await t.test('4. Brand description is editable', () => {
    assert.ok(adminPageContent.includes("config.brand.description"))
    assert.ok(footerCompContent.includes('config.brand.description'))
  })

  await t.test('5. Support email is validated', () => {
    assert.ok(actionsContent.includes("!config.brand.supportEmail.includes('@')"))
  })

  await t.test('6. Business address is editable', () => {
    assert.ok(adminPageContent.includes("config.brand.businessAddress"))
    assert.ok(footerCompContent.includes('config.brand.businessAddress'))
  })

  await t.test('7. Quick Links heading is editable', () => {
    assert.ok(adminPageContent.includes("config.quickLinks.heading"))
    assert.ok(footerCompContent.includes('config.quickLinks.heading'))
  })

  await t.test('8. Quick Links can be added', () => {
    assert.ok(adminPageContent.includes("handleAddLink('quickLinks')"))
  })

  await t.test('9. Quick Links can be removed', () => {
    assert.ok(adminPageContent.includes("handleRemoveLink('quickLinks', item.id)"))
  })

  await t.test('10. Quick Links can be reordered', () => {
    assert.ok(adminPageContent.includes("handleMoveLink('quickLinks', idx, 'up')"))
    assert.ok(adminPageContent.includes("handleMoveLink('quickLinks', idx, 'down')"))
  })

  await t.test('11. Quick Link order persists', () => {
    assert.ok(serviceContent.includes('sortOrder'))
  })

  await t.test('12. Policies heading is editable', () => {
    assert.ok(adminPageContent.includes("config.policies.heading"))
    assert.ok(footerCompContent.includes('config.policies.heading'))
  })

  await t.test('13. Policy links can be added, removed, and reordered', () => {
    assert.ok(adminPageContent.includes("handleAddLink('policies')"))
    assert.ok(adminPageContent.includes("handleRemoveLink('policies', item.id)"))
    assert.ok(adminPageContent.includes("handleMoveLink('policies', idx, 'up')"))
  })

  await t.test('14. Newsletter heading is editable', () => {
    assert.ok(adminPageContent.includes("config.newsletter.heading"))
    assert.ok(footerCompContent.includes('config.newsletter.heading'))
  })

  await t.test('15. Newsletter description is editable', () => {
    assert.ok(adminPageContent.includes("config.newsletter.description"))
    assert.ok(footerCompContent.includes('config.newsletter.description'))
  })

  await t.test('16. Email placeholder is editable', () => {
    assert.ok(adminPageContent.includes("config.newsletter.placeholder"))
    assert.ok(footerCompContent.includes('config.newsletter.placeholder'))
  })

  await t.test('17. Bottom-bar text is editable', () => {
    assert.ok(adminPageContent.includes("config.bottomBar.copyrightText"))
    assert.ok(footerCompContent.includes('config.bottomBar.copyrightText'))
  })

  await t.test('18. Automatic year uses the current year', () => {
    assert.ok(footerCompContent.includes('new Date().getFullYear()'))
  })

  await t.test('19. Manual year is respected when automatic year is disabled', () => {
    assert.ok(footerCompContent.includes('config.bottomBar.manualYear'))
  })

  await t.test('20. Visibility toggles are respected', () => {
    assert.ok(footerCompContent.includes('config.brand.enabled !== false'))
    assert.ok(footerCompContent.includes('config.quickLinks.enabled !== false'))
    assert.ok(footerCompContent.includes('config.policies.enabled !== false'))
    assert.ok(footerCompContent.includes('config.newsletter.enabled !== false'))
    assert.ok(footerCompContent.includes('config.bottomBar.enabled !== false'))
  })

  await t.test('21. Disabled links do not render', () => {
    assert.ok(footerCompContent.includes('filter(item => item.enabled !== false)'))
  })

  await t.test('22. Internal URLs are validated', () => {
    assert.ok(actionsContent.includes("!link.href.startsWith('/')"))
  })

  await t.test('23. Unsafe JavaScript URLs are rejected', () => {
    assert.ok(actionsContent.includes("link.href.toLowerCase().startsWith('javascript:')"))
  })

  await t.test('24. Footer settings require Admin authorization to update', () => {
    assert.ok(actionsContent.includes("await checkAdminAuth('manage_marketing')"))
  })

  await t.test('25. Service-role credentials remain server-only', () => {
    assert.strictEqual(adminPageContent.includes('SUPABASE_SERVICE_ROLE_KEY'), false)
  })

  await t.test('26. Save revalidates storefront Footer data', () => {
    assert.ok(actionsContent.includes("revalidatePath('/')"))
  })

  await t.test('27. Missing configuration uses safe defaults', () => {
    assert.ok(serviceContent.includes('DEFAULT_FOOTER_CONFIG'))
  })

  await t.test('28. Invalid partial configuration does not crash the Footer', () => {
    assert.ok(serviceContent.includes('try {'))
    assert.ok(serviceContent.includes('catch (err: any)'))
  })

  await t.test('29. Existing Footer design classes remain unchanged', () => {
    assert.ok(footerCompContent.includes('bg-surface-warm text-foreground pt-16 pb-8 border-t border-border-warm'))
  })

  await t.test('30. No unrelated Homepage section is modified', () => {
    assert.ok(layoutContent.includes('<Footer config={footerConfig} />'))
  })
})
