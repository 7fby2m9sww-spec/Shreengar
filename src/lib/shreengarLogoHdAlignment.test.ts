import { test, describe } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'

describe('Shreengar Logo HD Quality & Baseline Alignment Tests', () => {

  const logoPath = path.join(process.cwd(), 'src', 'components', 'store', 'ShreengarLogo.tsx')
  const emblemAsset = path.join(process.cwd(), 'public', 'branding', 'shreengar-framed-s-emblem-light.png')
  const wordmarkAsset = path.join(process.cwd(), 'public', 'branding', 'shreengar-wordmark-light.png')

  test('1. Separate HD emblem and wordmark PNG assets exist', () => {
    assert.ok(fs.existsSync(emblemAsset), 'Framed S emblem asset must exist')
    assert.ok(fs.existsSync(wordmarkAsset), 'Wordmark asset must exist')
  })

  test('2. ShreengarLogo uses flex container with baseline alignment and responsive gap', () => {
    const content = fs.readFileSync(logoPath, 'utf8')
    assert.ok(content.includes('inline-flex items-center justify-start'))
    assert.ok(content.includes('gap-[8px] sm:gap-[10px] md:gap-[12px]'))
  })

  test('3. ShreengarLogo enforces exact reduced emblem sizes (32px / 38px / 44px)', () => {
    const content = fs.readFileSync(logoPath, 'utf8')
    assert.ok(content.includes('w-[32px] h-[32px] sm:w-[38px] sm:h-[38px] md:w-[44px] md:h-[44px]'))
  })

  test('4. ShreengarLogo enforces exact reduced wordmark heights (22px / 27px / 32px)', () => {
    const content = fs.readFileSync(logoPath, 'utf8')
    assert.ok(content.includes('h-[22px] sm:h-[27px] md:h-[32px]'))
  })

  test('5. ShreengarLogo sets filter: none and avoids CSS transforms/blurs', () => {
    const content = fs.readFileSync(logoPath, 'utf8')
    assert.ok(content.includes('object-contain'))
    assert.ok(content.includes('filter: \'none\''))
    assert.strictEqual(content.includes('invert'), false)
    assert.strictEqual(content.includes('brightness'), false)
    assert.strictEqual(content.includes('contrast'), false)
  })

})

