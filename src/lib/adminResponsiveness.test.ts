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
  const adminUiPath = path.join(process.cwd(), 'src', 'components', 'admin', 'AdminUI.tsx')
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
    assert.ok(
      content.includes('w-[calc(100vw-24px)]') && content.includes('right-[-8px] sm:right-0'),
      'Must configure notification popover width and position to adapt on mobile'
    )
  })

  await t.test('3. AdminPageHeader actions wrap responsively', () => {
    assert.ok(fs.existsSync(pageHeaderPath), 'AdminPageHeader.tsx must exist')
    const content = fs.readFileSync(pageHeaderPath, 'utf8')
    assert.ok(content.includes('className="flex flex-wrap items-center gap-3 flex-shrink-0"'), 'Must use flex-wrap and gap-3 to wrap button groups on mobile')
  })

  await t.test('4. Dashboard Monthly Sales Chart is horizontally scrollable on mobile but fluid on desktop/tablet', () => {
    assert.ok(fs.existsSync(dashboardPagePath), 'Dashboard page.tsx must exist')
    const content = fs.readFileSync(dashboardPagePath, 'utf8')
    assert.ok(content.includes('overflow-x-auto custom-scrollbar'), 'Must wrap chart in overflow-x-auto container')
    assert.ok(content.includes('md:min-w-0 min-w-[500px]'), 'Must use min-width 500px on mobile but allow fluid layout on larger viewports')
    assert.ok(content.includes('p-4 sm:p-5'), 'Must reduce chart card padding on mobile screens')
    assert.ok(content.includes('dark:bg-[#211318]'), 'Must define dark background on sales summary card')
    assert.ok(content.includes('dark:border-[#5D3944]'), 'Must define dark border on sales summary card')
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

  await t.test('8. MetricCard has mobile-responsive padding, value sizing, and wrapping flex layers', () => {
    assert.ok(fs.existsSync(adminUiPath), 'AdminUI.tsx must exist')
    const content = fs.readFileSync(adminUiPath, 'utf8')
    assert.ok(content.includes('p-4 sm:p-6'), 'Must use reduced padding on mobile for stats cards')
    assert.ok(content.includes('p-2.5 sm:p-3 rounded-lg sm:rounded-xl'), 'Must reduce icon wrapper size on mobile')
    assert.ok(content.includes('text-2xl sm:text-3xl'), 'Must scale value numbers responsively to prevent horizontal overflows')
    assert.ok(content.includes('flex flex-wrap items-baseline gap-1.5 sm:gap-2'), 'Must use wrapping flex logic for value + badge metadata')
    assert.ok(content.includes('flex flex-wrap items-center gap-1.5 text-xs'), 'Must wrap trend status text and badge rows cleanly')
  })

  await t.test('9. Dashboard Recent Customer Orders list stacks on mobile and supports dark mode', () => {
    assert.ok(fs.existsSync(dashboardPagePath), 'Dashboard page.tsx must exist')
    const content = fs.readFileSync(dashboardPagePath, 'utf8')
    assert.ok(content.includes('flex flex-col sm:flex-row sm:items-center'), 'Must use flex-col on mobile and sm:flex-row on desktop/tablet for recent order rows')
    assert.ok(content.includes('className="sm:hidden"'), 'Must hide mobile status badge on larger screens')
    assert.ok(content.includes('className="hidden sm:inline-flex"'), 'Must hide desktop status badge on smaller screens')
    assert.ok(content.includes('dark:bg-[#211318]'), 'Must support dark background on recent orders card')
    assert.ok(content.includes('dark:border-[#5D3944]'), 'Must support dark border on recent orders card')
  })

  await t.test('10. Dashboard Recent Activity audit list wraps descriptions and supports dark mode', () => {
    assert.ok(fs.existsSync(dashboardPagePath), 'Dashboard page.tsx must exist')
    const content = fs.readFileSync(dashboardPagePath, 'utf8')
    assert.ok(content.includes('break-words'), 'Must wrap long activity descriptions to prevent horizontal overflow')
    assert.ok(content.includes('flex flex-wrap items-center justify-between gap-1'), 'Must wrap user emails and timestamps on narrow layouts')
    assert.ok(content.includes('dark:bg-[#211318]'), 'Must support dark background on recent activity card')
    assert.ok(content.includes('dark:border-[#5D3944]'), 'Must support dark border on recent activity card')
  })

  await t.test('11. Homepage Hero Banner editor has simplified single-image uploader and responsive previews', () => {
    const homepagePagePath = path.join(process.cwd(), 'src', 'app', 'admin', '(dashboard)', 'homepage', 'page.tsx')
    assert.ok(fs.existsSync(homepagePagePath), 'Homepage manager page.tsx must exist')
    const content = fs.readFileSync(homepagePagePath, 'utf8')
    assert.ok(content.includes('DESKTOP BANNER'), 'Must display DESKTOP BANNER section')
    assert.ok(content.includes('MOBILE BANNER'), 'Must display MOBILE BANNER section')
    assert.ok(content.includes('handlePointerDown'), 'Must hook visual pointer down listener')
    assert.ok(content.includes('handlePointerMove'), 'Must hook visual pointer move listener')
    assert.ok(content.includes('editDesktopScale'), 'Must maintain desktop scale state')
    assert.ok(content.includes('editMobileScale'), 'Must maintain mobile scale state')
    assert.ok(content.includes('type="range"'), 'Must offer zoom slider ranges')
    assert.ok(content.includes('[ Reset Position ]'), 'Must offer reset position triggers')
  })
})
