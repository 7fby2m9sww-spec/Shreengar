import { Category } from '@/types/database'

export interface CategoryTreeNode extends Category {
  product_count: number
  parent_id: string | null
  parent_name?: string | null
  depth: number
  path: string
  direct_product_count: number
  total_product_count: number
  child_count: number
  children: CategoryTreeNode[]
  is_unlinked?: boolean
}

export interface ParentOption {
  id: string | null
  label: string
  disabled?: boolean
}

/**
 * Safely builds a hierarchical CategoryTreeNode array from flat category rows.
 * Implements cycle protection via visitedSet to handle legacy corrupt loops.
 * Groups orphaned nodes under an "Unlinked Categories" fallback root.
 */
export function buildCategoryTree(categories: (Category & { product_count?: number })[]): CategoryTreeNode[] {
  const map = new Map<string, CategoryTreeNode>()

  // 1. Initialize nodes
  for (const cat of categories) {
    const directCount = cat.product_count || 0
    map.set(cat.id, {
      ...cat,
      product_count: directCount,
      parent_id: cat.parent_id || null,
      depth: 0,
      path: cat.name,
      direct_product_count: directCount,
      total_product_count: directCount,
      child_count: 0,
      children: [],
    })
  }

  const roots: CategoryTreeNode[] = []
  const unlinkedNodes: CategoryTreeNode[] = []

  // 2. Build parent-child relationships safely
  for (const node of map.values()) {
    if (node.parent_id) {
      if (map.has(node.parent_id)) {
        const parent = map.get(node.parent_id)!
        parent.children.push(node)
        node.parent_name = parent.name
      } else {
        // Parent ID points to non-existent category -> mark as unlinked
        node.is_unlinked = true
        unlinkedNodes.push(node)
      }
    } else {
      roots.push(node)
    }
  }

  // 3. Process tree recursively with cycle detection (visitedSet)
  function processNode(
    node: CategoryTreeNode,
    currentDepth: number,
    currentPath: string,
    visitedSet: Set<string>
  ): number {
    if (visitedSet.has(node.id)) {
      // Loop detected! Break recursion safely
      console.warn(`[categoryTree] Circular reference detected at category ID: ${node.id}`)
      return node.direct_product_count
    }

    const nextVisited = new Set(visitedSet)
    nextVisited.add(node.id)

    node.depth = currentDepth
    node.path = currentPath
    node.child_count = node.children.length

    // Sort children by display_order ascending, then name
    node.children.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0) || a.name.localeCompare(b.name))

    let sumProductCount = node.direct_product_count

    for (const child of node.children) {
      const childPath = `${currentPath} > ${child.name}`
      sumProductCount += processNode(child, currentDepth + 1, childPath, nextVisited)
    }

    node.total_product_count = sumProductCount
    return sumProductCount
  }

  // Sort roots
  roots.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0) || a.name.localeCompare(b.name))

  for (const root of roots) {
    processNode(root, 0, root.name, new Set())
  }

  // If unlinked categories exist, wrap them in a fallback group root
  if (unlinkedNodes.length > 0) {
    const unlinkedRoot: CategoryTreeNode = {
      id: 'unlinked-root-fallback',
      name: 'Unlinked Categories (Missing Parent)',
      slug: 'unlinked-categories',
      description: 'Categories whose parent category no longer exists in the database.',
      image_url: null,
      parent_id: null,
      display_order: 9999,
      is_active: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      product_count: 0,
      direct_product_count: 0,
      total_product_count: 0,
      depth: 0,
      path: 'Unlinked Categories',
      child_count: unlinkedNodes.length,
      children: unlinkedNodes,
      is_unlinked: true,
    }

    for (const child of unlinkedNodes) {
      processNode(child, 1, `Unlinked Categories > ${child.name}`, new Set(['unlinked-root-fallback']))
    }

    roots.push(unlinkedRoot)
  }

  return roots
}

/**
 * Returns all descendant IDs of a given category ID (inclusive of categoryId) with cycle protection.
 */
export function getDescendantCategoryIds(categories: Category[], categoryId: string): Set<string> {
  const descendantIds = new Set<string>([categoryId])
  let addedNew = true
  let maxPasses = 50 // Safeguard against infinite loops

  while (addedNew && maxPasses > 0) {
    addedNew = false
    maxPasses--
    for (const cat of categories) {
      if (cat.parent_id && descendantIds.has(cat.parent_id) && !descendantIds.has(cat.id)) {
        descendantIds.add(cat.id)
        addedNew = true
      }
    }
  }

  return descendantIds
}

/**
 * Generates formatted, searchable parent category options (e.g. "Women > Kurtis > Short Kurtis").
 * Disables self and all descendant categories to prevent circular reference selection.
 */
export function getParentCategoryOptions(
  categories: (Category & { product_count?: number })[],
  currentCategoryId?: string | null
): ParentOption[] {
  const tree = buildCategoryTree(categories)
  const forbiddenIds = currentCategoryId ? getDescendantCategoryIds(categories, currentCategoryId) : new Set<string>()

  const options: ParentOption[] = [
    { id: null, label: 'None — Root Category' }
  ]

  function traverse(nodes: CategoryTreeNode[], visited = new Set<string>()) {
    for (const node of nodes) {
      if (visited.has(node.id) || node.id === 'unlinked-root-fallback') continue
      const nextVisited = new Set(visited)
      nextVisited.add(node.id)

      const isForbidden = forbiddenIds.has(node.id)
      options.push({
        id: node.id,
        label: node.path,
        disabled: isForbidden
      })
      if (node.children && node.children.length > 0) {
        traverse(node.children, nextVisited)
      }
    }
  }

  traverse(tree)
  return options
}

/**
 * Flattens a CategoryTreeNode tree into an ordered array based on expansion state with cycle safety.
 */
export function flattenCategoryTree(
  tree: CategoryTreeNode[],
  expandedIds: Set<string>
): CategoryTreeNode[] {
  const result: CategoryTreeNode[] = []

  function traverse(nodes: CategoryTreeNode[], visited = new Set<string>()) {
    for (const node of nodes) {
      if (visited.has(node.id)) continue
      const nextVisited = new Set(visited)
      nextVisited.add(node.id)

      result.push(node)
      if (node.children && node.children.length > 0 && expandedIds.has(node.id)) {
        traverse(node.children, nextVisited)
      }
    }
  }

  traverse(tree)
  return result
}
