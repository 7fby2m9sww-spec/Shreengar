import sys
import os

file_path = 'src/services/products.ts'
with open(file_path, 'r') as f:
    lines = f.readlines()

mutations = [
    'updateInventoryStock(',
    'createProduct(',
    'updateProduct(',
    'deleteProduct(',
    'createCategory(',
    'updateCategory(',
    'deleteCategory(',
    'createCollection(',
    'updateCollection(',
    'deleteCollection(',
    'deleteProductImage(',
    'reorderProductImages(',
    'setProductFeaturedImage(',
    'createVariant(',
    'updateVariant(',
    'deleteVariant(',
    'updateInventory(',
    'adjustInventory('
]

read_lines = []
admin_lines = []

admin_lines.append("import 'server-only'\n")
admin_lines.append("import { createAdminClient } from '@/lib/supabase/admin'\n")
admin_lines.append("import { ProductInput, CategoryInput, CollectionInput } from '@/lib/validation/catalog'\n")
admin_lines.append("import { VariantInput } from '@/lib/validation/variant'\n")
admin_lines.append("\n")

# Extract mapProductInputToDb (used by createProduct and updateProduct)
map_product_fn_lines = []
in_map_product = False
brace_count = 0

i = 0
while i < len(lines):
    line = lines[i]
    if line.startswith('function mapProductInputToDb('):
        in_map_product = True
        brace_count = 0
    if in_map_product:
        map_product_fn_lines.append(line)
        brace_count += line.count('{') - line.count('}')
        if brace_count == 0 and '{' in ''.join(map_product_fn_lines):
            in_map_product = False
    i += 1

admin_lines.extend(map_product_fn_lines)
admin_lines.append("\n")

def getStoragePathFromUrl_extraction():
    helper = []
    in_helper = False
    bc = 0
    for l in lines:
        if l.startswith('function getStoragePathFromUrl('):
            in_helper = True
            bc = 0
        if in_helper:
            helper.append(l)
            bc += l.count('{') - l.count('}')
            if bc == 0 and '{' in ''.join(helper):
                in_helper = False
    return helper

admin_lines.extend(getStoragePathFromUrl_extraction())
admin_lines.append("\n")

in_mutation = False
brace_count = 0
skip_admin_helper = False
skip_map_product = False
skip_storage_helper = False

for line in lines:
    # Remove getAdminClient block
    if line.startswith('function getAdminClient()'):
        skip_admin_helper = True
        brace_count = 0
    if skip_admin_helper:
        brace_count += line.count('{') - line.count('}')
        if brace_count == 0:
            skip_admin_helper = False
        continue

    # Remove mapProductInputToDb
    if line.startswith('function mapProductInputToDb('):
        skip_map_product = True
        brace_count = 0
    if skip_map_product:
        brace_count += line.count('{') - line.count('}')
        if brace_count == 0:
            skip_map_product = False
        continue
        
    # Remove getStoragePathFromUrl
    if line.startswith('function getStoragePathFromUrl('):
        skip_storage_helper = True
        brace_count = 0
    if skip_storage_helper:
        brace_count += line.count('{') - line.count('}')
        if brace_count == 0:
            skip_storage_helper = False
        continue

    # Remove the unneeded imports from products.ts
    if line.startswith("import { createClient as createSupabaseClient } from '@supabase/supabase-js'"):
        continue
    if line.startswith("import { ProductInput, CategoryInput, CollectionInput } from '@/lib/validation/catalog'"):
        continue
    if line.startswith("import { VariantInput } from '@/lib/validation/variant'"):
        continue

    is_mutation_start = False
    if line.startswith('export async function '):
        for m in mutations:
            if line.startswith(f'export async function {m}'):
                is_mutation_start = True
                break

    if is_mutation_start:
        in_mutation = True
        brace_count = 0
    
    if in_mutation:
        # replace getAdminClient with createAdminClient inside admin_lines
        line_to_add = line.replace('getAdminClient()', 'createAdminClient()').replace('createClient()', 'createAdminClient()')
        
        # We need to handle partial product_images insert failure for createProduct
        # I'll do this replacement post-processing on admin_lines
        admin_lines.append(line_to_add)
        
        brace_count += line.count('{') - line.count('}')
        if brace_count == 0 and '{' in line:
            in_mutation = False
            admin_lines.append('\n')
    else:
        read_lines.append(line)

os.makedirs('src/services/admin', exist_ok=True)

# Post process createProduct to handle partial image insert
admin_content = ''.join(admin_lines)
admin_content = admin_content.replace(
    "await supabase.from('product_images').insert(imgInserts)",
    "const { error: imgError } = await supabase.from('product_images').insert(imgInserts)\n      if (imgError) {\n        console.error(`Image insert failed for product ${newRecord.id}:`, imgError)\n        return { success: false, error: 'Product created, but failed to save images. Please upload them again.' }\n      }"
)

with open('src/services/admin/products.ts', 'w') as f:
    f.write(admin_content)

with open('src/services/products.ts', 'w') as f:
    f.write(''.join(read_lines))

print("Split completed successfully.")
