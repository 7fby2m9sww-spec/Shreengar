import os
import re

with open('src/services/products.ts', 'r') as f:
    prod_lines = f.readlines()

with open('src/services/admin/products.ts', 'r') as f:
    admin_lines = f.readlines()

# We need to find where updateInventory is broken in admin/products.ts
# and where it continues in products.ts
admin_text = ''.join(admin_lines)
prod_text = ''.join(prod_lines)

# In admin_lines, updateInventory is at:
# export async function updateInventory(
#   id: string,
#   data: { reorder_level?: number; warehouse_location?: string }
# 
# export async function adjustInventory(

broken_part = """export async function updateInventory(
  id: string,
  data: { reorder_level?: number; warehouse_location?: string }"""

# In prod_lines, the continuation is:
# ): Promise<{ success: boolean; error?: string }> {
# ... to the end of the file ... (wait, getPaginatedProducts is in admin!)

# Wait, let's just find the start of the continuation in products.ts
continuation_idx = -1
for i, line in enumerate(prod_lines):
    if line.startswith("): Promise<{ success: boolean; error?: string }> {"):
        continuation_idx = i
        break

if continuation_idx != -1:
    continuation_lines = prod_lines[continuation_idx:]
    # This continuation is the rest of updateInventory. Does it contain anything else?
    continuation_str = ''.join(continuation_lines)
    
    # We will replace the broken part in admin_text with the combined part
    combined = broken_part + '\n' + continuation_str
    
    admin_text = admin_text.replace(broken_part, combined)
    
    # And remove the continuation from prod_lines
    prod_lines = prod_lines[:continuation_idx]
    
# Now admin_text has the fixed updateInventory!
# However, we need to extract the READ functions that were mistakenly put into admin/products.ts
# getVariants, getVariantById, getInventory, getInventoryHistory, getPaginatedProducts

# Instead of doing that string manipulation, let's write a robust function extractor
def extract_function(text, fn_name):
    # regex to find export async function fn_name
    match = re.search(r'(export\s+(?:async\s+)?function\s+' + fn_name + r'\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{)', text)
    if not match:
        return None, text
    start_idx = match.start()
    
    # Now we find the matching closing brace
    brace_count = 0
    in_string = False
    string_char = None
    in_comment = False
    
    i = match.end() - 1
    # text[i] is '{'
    
    while i < len(text):
        char = text[i]
        
        if in_comment:
            if char == '\n':
                in_comment = False
        elif in_string:
            if char == '\\':
                i += 2
                continue
            elif char == string_char:
                in_string = False
        else:
            if char == '/' and i + 1 < len(text) and text[i+1] == '/':
                in_comment = True
            elif char in ["'", '"', '`']:
                in_string = True
                string_char = char
            elif char == '{':
                brace_count += 1
            elif char == '}':
                brace_count -= 1
                if brace_count == 0:
                    break
        i += 1
    
    end_idx = i + 1
    fn_text = text[start_idx:end_idx]
    new_text = text[:start_idx] + text[end_idx:]
    return fn_text, new_text

# The reads mistakenly in admin_text:
read_fns = ['getVariants', 'getVariantById', 'getInventory', 'getInventoryHistory', 'getPaginatedProducts']
extracted_reads = []

for fn in read_fns:
    fn_text, admin_text = extract_function(admin_text, fn)
    if fn_text:
        # replace getAdminClient() or createAdminClient() back to createClient()
        fn_text = fn_text.replace('createAdminClient()', 'createClient()')
        extracted_reads.append(fn_text)

# Add them to prod_lines
prod_text = ''.join(prod_lines) + '\n\n' + '\n\n'.join(extracted_reads) + '\n'

with open('src/services/admin/products.ts', 'w') as f:
    f.write(admin_text)

with open('src/services/products.ts', 'w') as f:
    f.write(prod_text)

print("Repair complete.")
