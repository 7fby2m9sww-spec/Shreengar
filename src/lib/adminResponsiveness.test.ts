import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('Shreengar Admin Dashboard Responsiveness & Layout Safety Suite', async (t) => {
  // Define paths
  const sidebarPath = path.join(process.cwd(), 'src', 'components', 'admin', 'layout', 'AdminSidebar.tsx')
  const topbarPath = path.join(process.cwd(), 'src', 'components', 'admin', 'layout', 'AdminTopbar.tsx')
  const pageHeaderPath = path.join(process.cwd(), 'src', 'components', 'admin', 'layout', 'AdminPageHeader.tsx')
  const dashboardPagePath = path.join(process.cwd(), 'src', 'app', 'admin', '(dashboard)', 'page.tsx')
  const dataTablePath = path.join(process.cwd(), 'src', 'components', 'ui', 'DataTable.tsx')
  const productFormPath = path.join(process.cwd(), 'src', 'components', 'admin', 'products', 'ProductForm.tsx')
  const tariffRateFormPath = path.join(process.cwd(), 'src', 'components', 'admin', 'shipping', 'TariffRateForm.tsx')

  await t.test('1. AdminSidebar has auto-collapse client-side listener', () => {
    assert.ok(fs.existsSync(sidebarPath), 'AdminSidebar.tsx must exist')
    const content = fs.readFileSync(sidebarPath, 'utf8')
    assert.ok(content.includes('window.innerWidth >= 768 && window.innerWidth < 1024'), 'Must auto-collapse on tablet viewport sizes')
    assert.ok(content.includes('setIsCollapsed(true)'), 'Must set collapse state to true on tablet')
    assert.ok(content.includes('setIsCollapsed(false)'), 'Must expand collapse state on desktop')
  })

  await t.test('2. AdminTopbar has responsive search bar sizing and spacing', () => {
    assert.ok(fs.existsSync(topbarPath), 'AdminTopbar.tsx must exist')
    const content = fs.readFileSync(topbarPath, 'utf8')
    assert.ok(content.includes('max-w-[110px] min-[360px]:max-w-[150px] xs:max-w-xs sm:max-w-md'), 'Must restrict search bar input width on mobile')
    assert.ok(content.includes('placeholder={searchPlaceholder}'), 'Must bind search placeholder dynamically')
    assert.ok(content.includes("px-3 sm:px-6 flex items-center justify-between sticky"), 'Must use reduced horizontal padding on mobile')
    assert.ok(content.includes("space-x-2 sm:space-x-4"), 'Must use reduced spacing on mobile actions')
  })

  await t.test('3. AdminPageHeader actions wrap responsively', () => {
    assert.ok(fs.existsSync(pageHeaderPath), 'AdminPageHeader.tsx must exist')
    const content = fs.readFileSync(pageHeaderPath, 'utf8')
    assert.ok(content.includes('className="flex flex-wrap items-center gap-3 flex-shrink-0"'), 'Must use flex-wrap and gap-3 to wrap button groups on mobile')
  })

  await t.test('4. Dashboard Monthly Sales Chart is horizontally scrollable on mobile', () => {
    assert.ok(fs.existsSync(dashboardPagePath), 'Dashboard page.tsx must exist')
    const content = fs.readFileSync(dashboardPagePath, 'utf8')
    assert.ok(content.includes('overflow-x-auto custom-scrollbar'), 'Must wrap chart in overflow-x-auto container')
    assert.ok(content.includes('min-w-[500px]'), 'Must enforce min-width on chart elements to keep columns readable')
  })

  await t.test('5. DataTable header wraps search and count fields on mobile', () => {
    assert.ok(fs.existsSync(dataTablePath), 'DataTable.tsx must exist')
    const content = fs.readFileSync(dataTablePath, 'utf8')
    assert.ok(content.includes('flex flex-col sm:flex-row sm:items-center gap-3 justify-between'), 'Must wrap table search bar and records counter vertically on mobile')
  })

  await t.test('6. ProductForm fields grid layout stacks on mobile', () => {
    assert.ok(fs.existsSync(productFormPath), 'ProductForm.tsx must exist')
    const content = fs.readFileSync(productFormPath, 'utf8')
    assert.ok(
      content.includes('grid grid-cols-1 sm:grid-cols-2 gap-3') ||
      content.includes('grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2'),
      'Must stack form select fields, details, or ranges on mobile portrait viewports'
    )
  })

  await t.test('7. TariffRateForm Weight Constraints stack on mobile', () => {
    assert.ok(fs.existsSync(tariffRateFormPath), 'TariffRateForm.tsx must exist')
    const content = fs.readFileSync(tariffRateFormPath, 'utf8')
    assert.ok(content.includes('grid grid-cols-1 sm:grid-cols-3 gap-3'), 'Must stack weight slab input fields on mobile')
  })
})
