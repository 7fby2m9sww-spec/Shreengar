import { test, describe } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'

describe('Shreengar Unified Logo Across Themes Suite', () => {

  const logoComponentPath = path.join(process.cwd(), 'src', 'components', 'store', 'ShreengarLogo.tsx')
  const headerPath = path.join(process.cwd(), 'src', 'components', 'store', 'Header.tsx')
  const footerPath = path.join(process.cwd(), 'src', 'components', 'store', 'Footer.tsx')
  const masterLogoAsset = path.join(process.cwd(), 'public', 'branding', 'shreengar-header-lockup-light-v3.png')

  test('1. ShreengarLogo reusable component exists', () => {
    assert.ok(fs.existsSync(logoComponentPath), 'ShreengarLogo component file must exist')
  })

  test('2. Master gold logo asset exists in public/branding', () => {
    assert.ok(fs.existsSync(masterLogoAsset), 'Master gold logo asset must exist')
  })

  test('3. ShreengarLogo renders official emblem and wordmark assets', () => {
    const content = fs.readFileSync(logoComponentPath, 'utf8')
    assert.ok(content.includes('shreengar-framed-s-emblem-light.png'))
    assert.ok(content.includes('shreengar-wordmark-light.png'))
  })

  test('4. ShreengarLogo enforces reduced responsive dimensions (32px / 38px / 44px)', () => {
    const content = fs.readFileSync(logoComponentPath, 'utf8')
    assert.ok(content.includes('h-[32px]'))
    assert.ok(content.includes('sm:h-[38px]'))
    assert.ok(content.includes('md:h-[44px]'))
  })

  test('5. ShreengarLogo applies object-contain and avoids filter/invert transforms', () => {
    const content = fs.readFileSync(logoComponentPath, 'utf8')
    assert.ok(content.includes('object-contain'))
    assert.ok(content.includes('filter: \'none\'') || content.includes('filter:\'none\'') || content.includes('filter: "none"'))
    assert.strictEqual(content.includes('invert'), false)
    assert.strictEqual(content.includes('brightness'), false)
    assert.strictEqual(content.includes('contrast'), false)
  })

  test('6. Header component embeds ShreengarLogo', () => {
    const content = fs.readFileSync(headerPath, 'utf8')
    assert.ok(content.includes('<ShreengarLogo'), 'Header must render ShreengarLogo')
  })

  test('7. Footer component embeds ShreengarLogo', () => {
    const content = fs.readFileSync(footerPath, 'utf8')
    assert.ok(content.includes('<ShreengarLogo'), 'Footer must render ShreengarLogo')
  })

})

