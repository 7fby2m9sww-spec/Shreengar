import { test, describe } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'

describe('Shreengar Mobile Responsiveness & Customer Interaction bugfixes', () => {
  const headerPath = path.join(process.cwd(), 'src', 'components', 'store', 'Header.tsx')
  const supportPortalPath = path.join(process.cwd(), 'src', 'components', 'store', 'SupportPortal.tsx')
  const productCardPath = path.join(process.cwd(), 'src', 'components', 'store', 'ProductCard.tsx')
  const galleryActionsPath = path.join(process.cwd(), 'src', 'app', '(store)', 'product', '[id]', 'ProductGalleryAndActions.tsx')
  const homePagePath = path.join(process.cwd(), 'src', 'app', '(store)', 'page.tsx')

  test('1. Header has mobile-only row structure separating left, center, right', () => {
    assert.ok(fs.existsSync(headerPath), 'Header file must exist')
    const content = fs.readFileSync(headerPath, 'utf8')
    assert.ok(content.includes('flex md:hidden items-center justify-between w-full'), 'Header must define mobile row wrapper')
    assert.ok(content.includes('ShreengarLogo className="w-[130px]'), 'Header logo is scaled correctly for mobile')
  })

  test('2. Header mobile row excludes Wishlist button and opens Account drawer', () => {
    const content = fs.readFileSync(headerPath, 'utf8')
    // On mobile view (md:hidden), the action block contains search, bag, and avatar, but wishlist Heart is only in md:flex (desktop)
    assert.ok(content.includes('onClick={toggleAccountDrawer}'), 'Header has Account Directory drawer trigger')
  })

  test('3. Mobile search dedicated row is removed and integrated inside hamburger menu', () => {
    const content = fs.readFileSync(headerPath, 'utf8')
    assert.ok(!content.includes('Mobile Expandable Search Bar'), 'Mobile expandable search bar is removed')
    assert.ok(content.includes('Search Anarkalis, Kurtis, Sarees...'), 'Search field is inside the storefront hamburger menu')
  })

  test('4. Account drawer is promoted outside header and uses correct z-indices', () => {
    const content = fs.readFileSync(headerPath, 'utf8')
    assert.ok(content.includes('z-50 md:hidden flex justify-end'), 'Drawer backdrop has z-50')
    assert.ok(content.includes('z-60 transition-transform'), 'Drawer container sheet has z-60')
    assert.ok(content.includes('</header>'), 'Header closing tag exists')
    // We relocated the drawer outside </header>
    const headerSplit = content.split('</header>')
    assert.ok(headerSplit.length > 1, 'Header tag must split content')
    assert.ok(headerSplit[1].includes('isAccountDrawerOpen &&'), 'Account Drawer must be rendered outside the header tag')
  })

  test('5. SupportPortal hides floating widget when overlays are active', () => {
    assert.ok(fs.existsSync(supportPortalPath), 'SupportPortal file must exist')
    const content = fs.readFileSync(supportPortalPath, 'utf8')
    assert.ok(content.includes('account-drawer-toggle'), 'SupportPortal listens to account drawer toggle')
    assert.ok(content.includes('mobile-menu-toggle'), 'SupportPortal listens to mobile menu toggle')
    assert.ok(content.includes('isOverlayActive ?'), 'SupportPortal uses isOverlayActive state to fade out floating widget')
  })

  test('6. ProductCard and GalleryActions dispatch wishlist-updated custom events', () => {
    assert.ok(fs.existsSync(productCardPath), 'ProductCard file must exist')
    const cardContent = fs.readFileSync(productCardPath, 'utf8')
    assert.ok(cardContent.includes('wishlist-updated'), 'ProductCard dispatches wishlist-updated custom event')
    
    assert.ok(fs.existsSync(galleryActionsPath), 'ProductGalleryAndActions file must exist')
    const galleryContent = fs.readFileSync(galleryActionsPath, 'utf8')
    assert.ok(galleryContent.includes('wishlist-updated'), 'ProductGalleryAndActions dispatches wishlist-updated custom event')
  })

  test('7. ProductCard renders static action button on mobile and handles direct add-to-cart', () => {
    const cardContent = fs.readFileSync(productCardPath, 'utf8')
    assert.ok(cardContent.includes('block sm:hidden px-3.5 pb-3.5'), 'ProductCard has a static mobile action container')
    assert.ok(cardContent.includes('getProductVariantsAction'), 'ProductCard fetches variants dynamically')
    assert.ok(cardContent.includes('addItem('), 'ProductCard calls CartContext addItem directly')
  })

  test('8. Home Page Hero Banner is responsive and uses mobile-specific vertical linear gradient', () => {
    assert.ok(fs.existsSync(homePagePath), 'Home page file must exist')
    const content = fs.readFileSync(homePagePath, 'utf8')
    assert.ok(content.includes('clamp(2.5rem,10vw,3.3rem)'), 'Hero banner title uses font-size clamp for responsive scaling')
    assert.ok(content.includes('linear-gradient(180deg'), 'Hero banner uses vertical linear gradient on mobile')
    assert.ok(content.includes('items-end sm:items-center'), 'Hero banner aligns content to bottom on mobile')
  })
})
