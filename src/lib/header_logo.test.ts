import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('Shreengar Header Unified Combined Logo Lockups Suite', async (t) => {
  const headerPath = path.join(process.cwd(), 'src', 'components', 'store', 'Header.tsx')
  const headerContent = fs.readFileSync(headerPath, 'utf8')

  const lightLockupPath = path.join(process.cwd(), 'public', 'branding', 'shreengar-header-lockup-light-v3.png')
  const darkLockupPath = path.join(process.cwd(), 'public', 'branding', 'shreengar-header-lockup-dark-v3.png')
  const appIconPath = path.join(process.cwd(), 'src', 'app', 'icon.png')
  const appFaviconPath = path.join(process.cwd(), 'src', 'app', 'favicon.ico')

  await t.test('1. Header uses Next.js Image for logo assets', () => {
    assert.ok(headerContent.includes("import Image from 'next/image'"))
    assert.ok(headerContent.includes('<Image'))
  })

  await t.test('2. Combined Light and Dark Logo Lockup files exist', () => {
    assert.ok(fs.existsSync(lightLockupPath), 'Light lockup file must exist')
    assert.ok(fs.existsSync(darkLockupPath), 'Dark lockup file must exist')
  })

  await t.test('3. Header references v3 combined lockup files', () => {
    assert.ok(headerContent.includes('src="/branding/shreengar-header-lockup-light-v3.png"'))
    assert.ok(headerContent.includes('src="/branding/shreengar-header-lockup-dark-v3.png"'))
  })

  await t.test('4. Header does NOT reference separate emblem or wordmark assets or V2 lockups', () => {
    assert.strictEqual(headerContent.includes('shreengar-header-lockup-light-v2.png'), false)
    assert.strictEqual(headerContent.includes('shreengar-header-lockup-dark-v2.png'), false)
    assert.strictEqual(headerContent.includes('shreengar-header-lockup-light-v1.png'), false)
    assert.strictEqual(headerContent.includes('shreengar-header-lockup-dark-v1.png'), false)
    assert.strictEqual(headerContent.includes('shreengar-framed-s-emblem-light.png'), false)
    assert.strictEqual(headerContent.includes('shreengar-framed-s-emblem-dark.png'), false)
    assert.strictEqual(headerContent.includes('shreengar-wordmark-light.png'), false)
    assert.strictEqual(headerContent.includes('shreengar-wordmark.png'), false)
    assert.strictEqual(headerContent.includes('shreengar-framed-s-emblem-header-light.png'), false)
    assert.strictEqual(headerContent.includes('shreengar-framed-s-emblem-header-dark.png'), false)
    assert.strictEqual(headerContent.includes('shreengar-wordmark-header-light.png'), false)
    assert.strictEqual(headerContent.includes('shreengar-wordmark-header-dark.png'), false)
  })

  await t.test('5. Site favicon and app icons are preserved', () => {
    assert.ok(fs.existsSync(appIconPath))
    assert.ok(fs.existsSync(appFaviconPath))
  })

  await t.test('6. Homepage Link has accessible aria-label="Shreengar homepage"', () => {
    assert.ok(headerContent.includes('href="/"'))
    assert.ok(headerContent.includes('aria-label="Shreengar homepage"'))
  })

  await t.test('7. Combined images carry alt texts and aria-hidden values appropriately', () => {
    assert.ok(headerContent.includes('alt="Shreengar"'))
    assert.ok(headerContent.includes('alt=""'))
    assert.ok(headerContent.includes('aria-hidden="true"'))
  })

  await t.test('8. Logo is NOT conditional on dynamic Javascript client theme resolution', () => {
    const startIdx = headerContent.indexOf('aria-label="Shreengar homepage"')
    const endIdx = headerContent.indexOf('</Link>', startIdx)
    const logoBlock = headerContent.substring(startIdx, endIdx)

    assert.strictEqual(logoBlock.includes('resolvedTheme'), false)
    assert.strictEqual(logoBlock.includes('theme ==='), false)
    assert.strictEqual(logoBlock.includes('mounted &&'), false)
    assert.strictEqual(logoBlock.includes('isMounted'), false)
  })

  await t.test('9. Unified lockup wrapper uses controlled aspect ratio and responsive widths', () => {
    assert.ok(headerContent.includes('aspect-[831/176]'))
    assert.ok(headerContent.includes('w-[155px] shrink-0 md:w-[190px] lg:w-[215px] xl:w-[230px]'))
  })

  await t.test('10. Theme styling is applied strictly via CSS class visibility', () => {
    const startIdx = headerContent.indexOf('aria-label="Shreengar homepage"')
    const endIdx = headerContent.indexOf('</Link>', startIdx)
    const logoBlock = headerContent.substring(startIdx, endIdx)

    assert.ok(logoBlock.includes('className="object-contain dark:hidden"'))
    assert.ok(logoBlock.includes('className="hidden object-contain dark:block"'))
  })

  await t.test('11. Both branding images bypass Next.js optimization using unoptimized', () => {
    const startIdx = headerContent.indexOf('aria-label="Shreengar homepage"')
    const endIdx = headerContent.indexOf('</Link>', startIdx)
    const logoBlock = headerContent.substring(startIdx, endIdx)

    // Count occurrences of unoptimized inside logo block
    const occurrences = (logoBlock.match(/unoptimized/g) || []).length
    assert.strictEqual(occurrences, 2, 'Both images must use unoptimized')
  })

  await t.test('12. No CSS filters or color transforms are applied', () => {
    const startIdx = headerContent.indexOf('aria-label="Shreengar homepage"')
    const endIdx = headerContent.indexOf('</Link>', startIdx)
    const logoBlock = headerContent.substring(startIdx, endIdx)

    assert.strictEqual(logoBlock.includes('filter'), false)
    assert.strictEqual(logoBlock.includes('invert'), false)
    assert.strictEqual(logoBlock.includes('drop-shadow'), false)
    assert.strictEqual(logoBlock.includes('shadow'), false)
    assert.strictEqual(logoBlock.includes('blur'), false)
  })

  await t.test('13. Navigation and search remain untouched', () => {
    assert.ok(headerContent.includes('All Collections'))
    assert.ok(headerContent.includes('Search Anarkalis, Kurtis...'))
  })
})
