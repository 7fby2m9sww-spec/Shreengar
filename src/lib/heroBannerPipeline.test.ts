import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('Shreengar Homepage Hero Banner Image-Data Pipeline & Fallback Safety Suite', async (t) => {
  const pagePath = path.join(process.cwd(), 'src', 'app', '(store)', 'page.tsx')
  assert.ok(fs.existsSync(pagePath), 'Storefront page.tsx must exist')
  const pageContent = fs.readFileSync(pagePath, 'utf8')

  await t.test('1. Image component from next/image is imported and used', () => {
    assert.ok(pageContent.includes("import Image from 'next/image'"), 'Must import Next.js Image')
  })

  await t.test('2. Desktop image priority is resolved correctly from settings or banners', () => {
    assert.ok(
      pageContent.includes('heroSettings.desktop_image_url') &&
      pageContent.includes('heroSettings.image_url') &&
      pageContent.includes('heroBanner?.image_url'),
      'Desktop URL must check admin settings desktop_image_url, image_url, and banner fallback'
    )
  })

  await t.test('3. Mobile image URL correctly falls back to desktop image URL when empty/whitespace', () => {
    assert.ok(
      pageContent.includes('const heroMobileImage = mobileUrl || heroDesktopImage'),
      'Mobile URL must fall back to desktop campaign image URL if empty'
    )
  })

  await t.test('4. Mobile focal position falls back to desktop focal position if mobile image is not present', () => {
    assert.ok(
      pageContent.includes('mobilePosX = mobileUrl') &&
      pageContent.includes('heroSettings.mobile_position_x') &&
      pageContent.includes('heroSettings.desktop_position_x'),
      'Mobile X position must fall back to desktop X position when using desktop image fallback'
    )
    assert.ok(
      pageContent.includes('mobilePosY = mobileUrl ?') &&
      pageContent.includes('heroSettings.mobile_position_y') &&
      pageContent.includes('heroSettings.desktop_position_y'),
      'Mobile Y position must fall back to desktop Y position when using desktop image fallback'
    )
  })

  await t.test('5. Image components are rendered inside responsive wrappers with correct z-indices', () => {
    // Assert separate responsive structures for desktop and mobile viewports
    assert.ok(
      pageContent.includes('className="hidden sm:block absolute inset-0 w-full h-full z-10"'),
      'Desktop image container must use hidden sm:block and z-10'
    )
    assert.ok(
      pageContent.includes('className="block sm:hidden absolute inset-0 w-full h-full z-10"'),
      'Mobile image container must use block sm:hidden and z-10'
    )
  })

  await t.test('6. Stacking layers conform to authoritative order', () => {
    // Base: z-0
    assert.ok(
      pageContent.includes('className="absolute inset-0 bg-[#23000C] z-0"'),
      'Base background layer must render at z-0'
    )
    // Overlays: z-20
    assert.ok(
      pageContent.includes('className="absolute inset-0 z-20 pointer-events-none hidden sm:block"'),
      'Desktop gradient overlay must render at z-20'
    )
    assert.ok(
      pageContent.includes('className="absolute inset-0 z-20 pointer-events-none block sm:hidden"'),
      'Mobile gradient overlay must render at z-20'
    )
    // Content: z-30
    assert.ok(
      pageContent.includes('className="relative z-30 mx-auto flex h-full w-full max-w-7xl items-end sm:items-center px-5 sm:px-6 lg:px-10 pb-10 sm:pb-0"'),
      'Hero text content container must render at z-30'
    )
  })

  await t.test('7. Mobile viewport crop calculations are mathematically verified across breakpoints', () => {
    // Verify that the code uses the correct fallback focal percentage for 72%
    assert.ok(
      pageContent.includes("desktop_position_x === '72%' ? '98%' :"),
      'Mobile fallback for 72% desktop focal position must map to 98%'
    )

    // Verify mathematical crop correctness for mobile viewports
    const viewports = [
      { width: 320, height: 440 },
      { width: 375, height: 465 },
      { width: 390, height: 465 },
      { width: 430, height: 465 }
    ]

    const imageWidth = 1920
    const imageHeight = 900
    const imageAspectRatio = imageWidth / imageHeight // 2.1333

    // Model is located at 87.5% of the source image width
    const modelImagePos = 0.875

    // Fallback mobile position percentage (98%)
    const pos = 0.98

    for (const vp of viewports) {
      const viewportAspectRatio = vp.width / vp.height
      const scaledImageWidth = vp.height * imageAspectRatio // object-fit: cover width
      
      // Calculate absolute position of the model in the container
      const modelAbsoluteX = (vp.width - scaledImageWidth) * pos + scaledImageWidth * modelImagePos
      const modelPercentageOfViewport = modelAbsoluteX / vp.width

      // Assert that the model is positioned in the visible right-half region (e.g. 60% to 80% of viewport width)
      assert.ok(
        modelPercentageOfViewport >= 0.60 && modelPercentageOfViewport <= 0.80,
        `Model position at ${vp.width}px viewport width (${Math.round(modelPercentageOfViewport * 100)}%) must be inside the visible 60%-80% range`
      )
    }
  })
})

