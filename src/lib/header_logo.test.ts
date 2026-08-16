import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('Shreengar Header Unified Logo Suite', async (t) => {
  const headerPath = path.join(process.cwd(), 'src', 'components', 'store', 'Header.tsx')
  const logoPath = path.join(process.cwd(), 'src', 'components', 'store', 'ShreengarLogo.tsx')
  const headerContent = fs.readFileSync(headerPath, 'utf8')
  const logoContent = fs.readFileSync(logoPath, 'utf8')

  const masterLockupPath = path.join(process.cwd(), 'public', 'branding', 'shreengar-header-lockup-light-v3.png')

  await t.test('1. Master Gold Logo Lockup file exists', () => {
    assert.ok(fs.existsSync(masterLockupPath), 'Master lockup file must exist')
  })

  await t.test('2. Header references unified ShreengarLogo component', () => {
    assert.ok(headerContent.includes('<ShreengarLogo'))
  })

  await t.test('3. ShreengarLogo renders master logo assets', () => {
    assert.ok(logoContent.includes('/branding/shreengar-framed-s-emblem-light.png'))
    assert.ok(logoContent.includes('/branding/shreengar-wordmark-light.png'))
  })

  await t.test('4. ShreengarLogo contains no CSS blur or invert filters', () => {
    assert.strictEqual(logoContent.includes('invert'), false)
    assert.strictEqual(logoContent.includes('brightness'), false)
  })

  await t.test('5. ShreengarLogo enforces controlled reduced responsive heights (32px / 38px / 44px)', () => {
    assert.ok(logoContent.includes('h-[32px] sm:h-[38px] md:h-[44px]'))
  })
})

