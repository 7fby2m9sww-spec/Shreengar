import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { ProductInput, CategoryInput, CollectionInput } from '@/lib/validation/catalog'
import { VariantInput } from '@/lib/validation/variant'
import { mapDbToAdminProduct } from '@/lib/mappers/product'
import { getCategoryCode, getColourCode, formatProductSku } from '@/lib/utils/sku'

import { AdminProduct, Category, ProductImage, ProductImageState, Collection } from '@/types/database'

export type ProductMutationResult = {
  success: boolean
  productId?: string
  product?: AdminProduct
  images?: ProductImage[]
  partialSuccess?: boolean
  warning?: string
  error?: string
  fieldErrors?: Record<string, string>
}

function mapProductInputToDb(data: Partial<ProductInput>): any {
  const mapped: any = {}
  if (data.title !== undefined) mapped.name = data.title
  if (data.slug !== undefined) mapped.slug = data.slug
  if (data.sku !== undefined) mapped.sku = data.sku
  if (data.selling_price !== undefined) mapped.selling_price = data.selling_price
  if (data.mrp !== undefined) mapped.mrp = data.mrp
  if (data.category_id !== undefined) mapped.category_id = data.category_id
  if (data.collection_id !== undefined) mapped.collection_id = data.collection_id
  if (data.fabric !== undefined) mapped.fabric = data.fabric
  if (data.occasion !== undefined) mapped.occasion = data.occasion
  if (data.care_instructions !== undefined) mapped.care_instructions = data.care_instructions
  if (data.description !== undefined) mapped.description = data.description
  if (data.details !== undefined) mapped.details = data.details
  if (data.short_description !== undefined) mapped.short_description = data.short_description
  if (data.material !== undefined) mapped.material = data.material
  if (data.fit !== undefined) mapped.fit = data.fit
  if (data.sleeve_type !== undefined) mapped.sleeve_type = data.sleeve_type
  if (data.neck_type !== undefined) mapped.neck_type = data.neck_type
  if (data.pattern !== undefined) mapped.pattern = data.pattern
  if (data.color_name !== undefined) mapped.color_name = data.color_name
  if (data.is_featured !== undefined) mapped.featured = data.is_featured
  if (data.is_trending !== undefined) mapped.trending = data.is_trending
  if (data.is_active !== undefined) mapped.is_active = data.is_active
  if (data.status !== undefined) {
    mapped.status = data.status
  } else if (data.is_active !== undefined) {
    mapped.status = data.is_active ? 'active' : 'draft'
  }
  if (data.delivery_available !== undefined) mapped.delivery_available = data.delivery_available
  if (data.show_delivery_estimate !== undefined) mapped.show_delivery_estimate = data.show_delivery_estimate
  if (data.showroom_collection_only !== undefined) mapped.showroom_collection_only = data.showroom_collection_only
  if (data.pickup_available !== undefined) mapped.pickup_available = data.pickup_available
  if (data.free_delivery !== undefined) mapped.free_delivery = data.free_delivery
  if (data.delivery_min_days !== undefined) mapped.delivery_min_days = data.delivery_min_days
  if (data.delivery_max_days !== undefined) mapped.delivery_max_days = data.delivery_max_days
  if (data.delivery_message !== undefined) mapped.delivery_message = data.delivery_message
  if (data.cod_available !== undefined) mapped.cod_available = data.cod_available
  if (data.express_delivery_available !== undefined) mapped.express_delivery_available = data.express_delivery_available
  if (data.return_window_days !== undefined) mapped.return_window_days = data.return_window_days
  if (data.return_policy_message !== undefined) mapped.return_policy_message = data.return_policy_message
  if (data.exchange_allowed !== undefined) mapped.exchange_allowed = data.exchange_allowed
  if (data.is_returnable !== undefined) mapped.is_returnable = data.is_returnable
  if (data.show_color_option !== undefined) mapped.show_color_option = data.show_color_option
  if (data.storefront_default_color_id !== undefined) mapped.storefront_default_color_id = data.storefront_default_color_id
  if (data.product_family_id !== undefined) mapped.product_family_id = data.product_family_id || null
  if (data.primary_color_id !== undefined) mapped.primary_color_id = data.primary_color_id || null
  if (data.colorway_sort_order !== undefined) mapped.colorway_sort_order = Number(data.colorway_sort_order)
  if (data.shipping_weight_grams !== undefined) mapped.shipping_weight_grams = data.shipping_weight_grams
  if (data.parcel_length_cm !== undefined) mapped.parcel_length_cm = data.parcel_length_cm
  if (data.parcel_width_cm !== undefined) mapped.parcel_width_cm = data.parcel_width_cm
  if (data.parcel_height_cm !== undefined) mapped.parcel_height_cm = data.parcel_height_cm
  if (data.show_storefront_stock_message !== undefined) mapped.show_storefront_stock_message = data.show_storefront_stock_message
  if (data.storefront_stock_message_quantity !== undefined) mapped.storefront_stock_message_quantity = data.storefront_stock_message_quantity
  return mapped
}

export async function resolveCategory(categoryName: string): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const supabase = createAdminClient()
    const normalized = categoryName.trim()
    if (!normalized) return { success: false, error: 'Category name cannot be empty.' }

    // 1. Search existing case-insensitive
    const { data: existing, error: searchErr } = await supabase
      .from('categories')
      .select('id')
      .ilike('name', normalized)
      .maybeSingle()

    if (searchErr) return { success: false, error: 'Database error searching categories.' }
    if (existing) return { success: true, data: existing.id }

    // 2. Not found, create it securely
    // Create a base slug
    let baseSlug = normalized.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    if (!baseSlug) baseSlug = 'category'

    // To prevent slug collisions if concurrent creations happen, we can try to insert
    const { data: newCat, error: insertErr } = await supabase
      .from('categories')
      .insert({
        name: normalized,
        slug: baseSlug,
        description: null,
      })
      .select('id')
      .maybeSingle()

    if (insertErr) {
      // If constraint violation (e.g., unique slug failed due to concurrency), fallback to lookup again
      if (insertErr.code === '23505') {
        const { data: retry } = await supabase.from('categories').select('id').ilike('name', normalized).maybeSingle()
        if (retry) return { success: true, data: retry.id }
      }
      return { success: false, error: 'Failed to create category: ' + insertErr.message }
    }

    if (newCat) return { success: true, data: newCat.id }
    
    return { success: false, error: 'Failed to resolve category ID.' }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}


export async function updateInventoryStock(
  inventoryId: string,
  newStock: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('inventory')
      .update({ stock: newStock, updated_at: new Date().toISOString() })
      .eq('id', inventoryId)

    if (!error) {
      await supabase.from('activity_logs').insert({
        action: 'inventory.stock_updated',
        module: 'inventory',
        details: { inventory_id: inventoryId, new_stock: newStock },
      })
      return { success: true }
    }
  } catch {}

  return { success: false, error: 'Failed to update stock in database' }
}



export async function createProduct(data: ProductInput): Promise<ProductMutationResult> {
  try {
    const supabase = createAdminClient()

    // Enforce Product Family category compatibility check
    if (data.product_family_id && data.category_id) {
      const { data: familyRow } = await supabase
        .from('product_families')
        .select('category_id')
        .eq('id', data.product_family_id)
        .maybeSingle()

      if (familyRow?.category_id && familyRow.category_id !== data.category_id) {
        return {
          success: false,
          error: 'This product category does not match the selected Product Family.'
        }
      }
    }

    // Enforce Product Family duplicate-colour prevention
    if (data.product_family_id && data.primary_color_id) {
      const { data: familyDup } = await supabase
        .from('products')
        .select('id, name')
        .eq('product_family_id', data.product_family_id)
        .eq('primary_color_id', data.primary_color_id)
        .maybeSingle()

      if (familyDup) {
        const { data: colorRow } = await supabase
          .from('colors')
          .select('name')
          .eq('id', data.primary_color_id)
          .maybeSingle()

        const colorNameText = colorRow?.name || 'selected'
        return {
          success: false,
          error: `A ${colorNameText} colourway already exists in this Product Family.`
        }
      }
    }

    const dbPayload = mapProductInputToDb(data)
    const { data: newRecord, error } = await supabase
      .from('products')
      .insert(dbPayload)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    // 1. Resolve or Create default Size and Color for Simple Products
    let sizeId = null
    try {
      const { data: sz } = await supabase.from('sizes').select('id').eq('name', 'One Size').maybeSingle()
      if (sz) {
        sizeId = sz.id
      } else {
        const { data: newSz, error: szErr } = await supabase.from('sizes').insert({ name: 'One Size', display_name: 'One Size' }).select().single()
        if (szErr) throw szErr
        if (newSz) sizeId = newSz.id
      }
    } catch (szErr: any) {
      console.error('Error resolving default size:', szErr.message)
      await supabase.from('products').delete().eq('id', newRecord.id)
      return {
        success: false,
        error: 'Product creation failed (default size could not be resolved): ' + szErr.message
      }
    }

    let colorId = null
    try {
      const { data: col } = await supabase.from('colors').select('id').eq('slug', 'default').maybeSingle()
      if (col) {
        colorId = col.id
      } else {
        const { data: newCol, error: colErr } = await supabase.from('colors').insert({ name: 'Default', slug: 'default', hex_code: '#E5DDC8' }).select().single()
        if (colErr) throw colErr
        if (newCol) colorId = newCol.id
      }
    } catch (colErr: any) {
      console.error('Error resolving default color:', colErr.message)
      await supabase.from('products').delete().eq('id', newRecord.id)
      return {
        success: false,
        error: 'Product creation failed (default color could not be resolved): ' + colErr.message
      }
    }

    // 2. Create variants (custom variants or fallback to default simple product variant)
    if (data.variants && data.variants.length > 0) {
      try {
        const canonicalMap = new Map<string, typeof data.variants[0]>()
        for (const v of data.variants) {
          const sId = v.sizeId || v.size_id || 'no-size'
          const cId = v.colorId || v.color_id || data.primary_color_id || 'default'
          const key = `${sId}:${cId}`
          if (!canonicalMap.has(key)) {
            canonicalMap.set(key, v)
          }
        }
        const uniqueVariants = Array.from(canonicalMap.values())

        // Validate size IDs:
        for (const v of uniqueVariants) {
          const rawSizeId = v.sizeId || v.size_id;
          if (rawSizeId) {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawSizeId);
            if (!isUuid) {
              await supabase.from('products').delete().eq('id', newRecord.id);
              return { success: false, error: 'Some selected sizes are invalid. Refresh the form and try again.' };
            }
            
            // Verify size exists
            const { data: sizeExists, error: sizeErr } = await supabase
              .from('sizes')
              .select('id')
              .eq('id', rawSizeId)
              .maybeSingle();

            if (sizeErr || !sizeExists) {
              await supabase.from('products').delete().eq('id', newRecord.id);
              return { success: false, error: 'Some selected sizes are invalid. Refresh the form and try again.' };
            }
          } else {
            await supabase.from('products').delete().eq('id', newRecord.id);
            return { success: false, error: 'Some selected sizes are invalid. Refresh the form and try again.' };
          }
        }

        const uniqueSizeIds = new Set(uniqueVariants.map(v => v.sizeId || v.size_id).filter(Boolean));
        if (uniqueSizeIds.size !== uniqueVariants.length) {
          await supabase.from('products').delete().eq('id', newRecord.id);
          return { success: false, error: 'Some selected sizes are invalid. Refresh the form and try again.' };
        }

        for (const v of uniqueVariants) {
          const sizeName = v.sizeName || v.size || 'M'
          const colName = v.colorName || v.color_name || null

          // Resolve size and color to UUIDs
          const rawSizeId = v.sizeId || v.size_id || null
          let vSizeId = rawSizeId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawSizeId) ? rawSizeId : null
          if (!vSizeId && sizeName) {
            const { data: sz } = await supabase.from('sizes').select('id').eq('name', sizeName).maybeSingle()
            if (sz) {
              vSizeId = sz.id
            } else {
              const { data: newSz } = await supabase.from('sizes').insert({ name: sizeName, display_name: sizeName }).select().single()
              if (newSz) vSizeId = newSz.id
            }
          }

          let vColorId = v.colorId || v.color_id || data.primary_color_id || null
          if (!vColorId && colName) {
            const { data: col } = await supabase.from('colors').select('id').eq('name', colName).maybeSingle()
            if (col) {
              vColorId = col.id
            } else {
              const { data: newCol } = await supabase.from('colors').insert({ name: colName, slug: colName.toLowerCase(), hex_code: v.color_code || '#000000' }).select().single()
              if (newCol) vColorId = newCol.id
            }
          }
          if (!vColorId) {
            const { data: defaultCol } = await supabase.from('colors').select('id').limit(1).single()
            if (defaultCol) vColorId = defaultCol.id
          }

          const qty = v.quantity ?? v.stock_quantity ?? 0
          const price = v.priceOverride ?? v.price_override ?? null
          const activeStatus = v.isActive ?? (v.is_active !== false)

          // Insert into public.product_variants using schema-valid columns
          const { data: newVar, error: varError } = await supabase
            .from('product_variants')
            .insert({
              product_id: newRecord.id,
              sku: v.sku,
              size_id: vSizeId,
              color_id: vColorId,
              selling_price: price,
              is_default: false,
              is_active: activeStatus,
              shipping_weight_grams: v.shipping_weight_grams !== undefined && v.shipping_weight_grams !== null ? Number(v.shipping_weight_grams) : null
            })
            .select()
            .single()

          if (varError || !newVar) throw varError || new Error('Failed to create variant.')

          const { error: invError } = await supabase
            .from('inventory')
            .insert({
              variant_id: newVar.id,
              quantity: qty,
              reserved_quantity: 0,
              low_stock_threshold: 5,
              reorder_level: 10,
              warehouse_location: 'Rack A1',
              stock_status: qty > 0 ? 'in_stock' : 'out_of_stock'
            })
          if (invError) throw invError
        }
      } catch (varError: any) {
        console.error('Custom variants creation failed:', varError.message)
        await supabase.from('products').delete().eq('id', newRecord.id)
        return {
          success: false,
          error: 'Product creation failed (variant initialization failed): ' + varError.message
        }
      }
    } else {
      let defaultVar = null
      try {
        const { data: dv, error: varError } = await supabase
          .from('product_variants')
          .insert({
            product_id: newRecord.id,
            sku: `${newRecord.sku}-DEF`,
            size_id: sizeId,
            color_id: colorId,
            is_default: true,
            is_active: true
          })
          .select()
          .single()
        if (varError) throw varError
        defaultVar = dv
      } catch (varError: any) {
        console.error('Default variant creation failed:', varError.message)
        await supabase.from('products').delete().eq('id', newRecord.id)
        return {
          success: false,
          error: 'Product creation failed (default variant could not be initialized): ' + varError.message
        }
      }

      // 3. Create the inventory row for this default variant
      try {
        const { error: invError } = await supabase
          .from('inventory')
          .insert({
            variant_id: defaultVar.id,
            quantity: data.stock_quantity || 0,
            reserved_quantity: 0,
            low_stock_threshold: 5,
            reorder_level: 10,
            warehouse_location: 'Rack A1',
            stock_status: (data.stock_quantity || 0) > 0 ? 'in_stock' : 'out_of_stock'
          })
        if (invError) throw invError
      } catch (invError: any) {
        console.error('Inventory row creation failed:', invError.message)
        await supabase.from('products').delete().eq('id', newRecord.id)
        return {
          success: false,
          error: 'Product creation failed (inventory row failed to initialize): ' + invError.message
        }
      }
    }

    let finalImages: ProductImage[] | undefined = undefined;

    if (data.images && data.images.length > 0) {
      const imgInserts = data.images.map((img: ProductImageState, idx: number) => {
        return {
          product_id: newRecord.id,
          image_url: img.image_url,
          storage_path: img.storage_path || null,
          display_order: idx,
          is_primary: idx === 0,
          alt_text: `${newRecord.name || ''} - Image ${idx + 1}`
        }
      })
      const { data: insertedImages, error: imgError } = await supabase.from('product_images').insert(imgInserts).select()
      if (imgError) {
        console.error(`Image insert failed for product ${newRecord.id}: [${imgError.code}] ${imgError.message}`)
        return { 
          success: false, 
          productId: newRecord.id,
          product: mapDbToAdminProduct({ ...newRecord, product_images: [] }),
          partialSuccess: true,
          error: 'Product was created, but images were not saved. Open the product and upload the images again.' 
        }
      }
      finalImages = insertedImages as ProductImage[];
    }

    await supabase.from('activity_logs').insert({
      action: 'catalog.product_created',
      module: 'products',
      details: { product_id: newRecord.id, sku: newRecord.sku },
    })

    const mappedProduct = mapDbToAdminProduct({
      ...newRecord,
      product_images: finalImages || []
    })

    return { success: true, productId: newRecord.id, product: mappedProduct, images: finalImages }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create product.' }
  }
}

export async function updateProduct(id: string, data: Partial<ProductInput>): Promise<ProductMutationResult> {
  try {
    const supabase = createAdminClient()

    // Enforce Product Family category compatibility check
    if (data.product_family_id && data.category_id) {
      const { data: familyRow } = await supabase
        .from('product_families')
        .select('category_id')
        .eq('id', data.product_family_id)
        .maybeSingle()

      if (familyRow?.category_id && familyRow.category_id !== data.category_id) {
        return {
          success: false,
          error: 'This product category does not match the selected Product Family.'
        }
      }
    }

    // Enforce Product Family duplicate-colour prevention
    if (data.product_family_id && data.primary_color_id) {
      const { data: familyDup } = await supabase
        .from('products')
        .select('id, name')
        .eq('product_family_id', data.product_family_id)
        .eq('primary_color_id', data.primary_color_id)
        .neq('id', id)
        .maybeSingle()

      if (familyDup) {
        const { data: colorRow } = await supabase
          .from('colors')
          .select('name')
          .eq('id', data.primary_color_id)
          .maybeSingle()

        const colorNameText = colorRow?.name || 'selected'
        return {
          success: false,
          error: `A ${colorNameText} colourway already exists in this Product Family.`
        }
      }
    }

    const dbPayload = mapProductInputToDb(data)
    const { data: updatedRecord, error } = await supabase
      .from('products')
      .update(dbPayload)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    let finalImages: ProductImage[] | undefined = undefined;
    let warning: string | undefined = undefined;

    if (data.images) {
      // 1. Fetch old images to check for deleted ones
      const { data: oldImages } = await supabase
        .from('product_images')
        .select('id, storage_path')
        .eq('product_id', id)

      const oldIds = oldImages?.map(i => i.id) || []
      const retainedImages = data.images.filter(img => img.type === 'existing') as Extract<ProductImageState, { type: 'existing' }>[];
      const newImages = data.images.filter(img => img.type === 'new') as Extract<ProductImageState, { type: 'new' }>[];
      
      const retainedIds = retainedImages.map(img => img.id);
      const removedIds = oldIds.filter(oldId => !retainedIds.includes(oldId));

      const p_retained_images = retainedImages.map((img) => {
        const actualIdx = data.images!.indexOf(img);
        return { id: img.id, display_order: actualIdx, is_primary: actualIdx === 0, alt_text: img.alt_text || null }
      });

      const p_new_images = newImages.map((img) => {
        const actualIdx = data.images!.indexOf(img);
        return { image_url: img.image_url, storage_path: img.storage_path, display_order: actualIdx, is_primary: actualIdx === 0, alt_text: img.alt_text || null }
      });

      const rpcPayload = {
        p_product_id: id,
        p_retained_images,
        p_new_images,
        p_removed_ids: removedIds
      };

      const { data: rpcData, error: rpcError } = await supabase.rpc('reconcile_product_images', rpcPayload)
      
      if (rpcError) {
        console.error(`Image RPC reconciliation failed for product ${id}: [${rpcError.code}] ${rpcError.message}`);
        return { 
          success: false, 
          productId: id,
          product: mapDbToAdminProduct({ ...updatedRecord, product_images: [] }),
          partialSuccess: true,
          error: 'Product was updated, but image reconciliation failed.' 
        }
      }

      finalImages = rpcData as ProductImage[];

      // Safe Storage Cleanup
      if (removedIds.length > 0 && oldImages) {
        try {
          const candidatePaths = oldImages
            .filter(img => removedIds.includes(img.id) && img.storage_path)
            .map(img => img.storage_path!);

          const validPaths: string[] = [];

          for (const path of candidatePaths) {
            // Validate prefix 'catalog/' or 'products/'
            if (!path.startsWith('catalog/') && !path.startsWith('products/')) {
              console.warn('[Storage Cleanup] Skipping path with invalid prefix:', path);
              continue;
            }

            // Query public.product_images to verify no remaining row references this storage_path
            const { data: refCheck, error: refError } = await supabase
              .from('product_images')
              .select('id')
              .eq('storage_path', path);

            if (refError) {
              console.error('[Storage Cleanup] Reference check error:', refError.message);
              continue;
            }

            if (!refCheck || refCheck.length === 0) {
              validPaths.push(path);
            }
          }

          if (validPaths.length > 0) {
            const { error: storageDelError } = await supabase.storage.from('products').remove(validPaths);
            if (storageDelError) {
              console.error('[Storage Cleanup] Remove failed:', storageDelError.message);
              warning = "Product was updated, but some unused image files could not be cleaned up.";
            }
          }

        } catch (cleanupErr: unknown) {
          const errMsg = cleanupErr instanceof Error ? cleanupErr.message : 'Unknown error';
          console.error('[Storage Cleanup] Unexpected error:', errMsg);
          warning = "Product was updated, but some unused image files could not be cleaned up.";
        }
      }
    }

    // 2. Handle variants/stock update
    if (data.variants !== undefined) {
      try {
        const { data: dbVariants, error: dbVarErr } = await supabase
          .from('product_variants')
          .select('id, sku, is_default, is_active')
          .eq('product_id', id);

        if (dbVarErr) throw dbVarErr;

        const existingDbVars = dbVariants || [];
        const canonicalMap = new Map<string, typeof data.variants[0]>()
        for (const v of data.variants) {
          const sId = v.size_id || v.sizeId || 'no-size'
          const cId = v.color_id || v.colorId || data.primary_color_id || 'default'
          const key = `${sId}:${cId}`
          if (!canonicalMap.has(key)) {
            canonicalMap.set(key, v)
          }
        }
        const submittedVars = Array.from(canonicalMap.values())

        // 1. Validate selected sizes first
        for (const v of submittedVars) {
          const val = v as any;
          if (val.isActive === false || val.isSizeRemoved === true) continue;
          const rawSizeId = val.sizeId || val.size_id;
          if (rawSizeId) {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawSizeId);
            if (!isUuid) {
              return { success: false, error: 'Some selected sizes are invalid. Refresh the form and try again.' };
            }
            
            // Verify size exists in public.sizes
            const { data: sizeExists, error: sizeErr } = await supabase
              .from('sizes')
              .select('id')
              .eq('id', rawSizeId)
              .maybeSingle();

            if (sizeErr || !sizeExists) {
              return { success: false, error: 'Some selected sizes are invalid. Refresh the form and try again.' };
            }
          } else {
            return { success: false, error: 'Some selected sizes are invalid. Refresh the form and try again.' };
          }
        }

        const activeSubmittedVars = submittedVars.filter(v => (v as any).isActive !== false && (v as any).isSizeRemoved !== true);
        const uniqueSizeIds = new Set(activeSubmittedVars.map(v => (v as any).sizeId || (v as any).size_id).filter(Boolean));
        if (uniqueSizeIds.size !== activeSubmittedVars.length) {
          return { success: false, error: 'Some selected sizes are invalid. Refresh the form and try again.' };
        }

        // Submitted variant IDs
        const submittedIds = submittedVars.map(v => v.id).filter(Boolean);

        // Variants to delete/deactivate (present in DB but not submitted)
        const varsToRemove = existingDbVars.filter(dbV => !submittedIds.includes(dbV.id));

        for (const oldVar of varsToRemove) {
          const { data: orderItems } = await supabase
            .from('order_items')
            .select('id')
            .eq('variant_id', oldVar.id)
            .limit(1);

          if (orderItems && orderItems.length > 0) {
            // Keep the variant but deactivate it to preserve history
            await supabase.from('product_variants').update({ is_active: false }).eq('id', oldVar.id);
          } else {
            // Delete safely
            await supabase.from('inventory').delete().eq('variant_id', oldVar.id);
            await supabase.from('product_variants').delete().eq('id', oldVar.id);
          }
        }

        // Fetch existing variants and inventory to only save changed rows
        const { data: dbVars } = await supabase
          .from('product_variants')
          .select('*, inventory(*)')
          .eq('product_id', id);
        
        const dbVarsMap = new Map(dbVars?.map(v => [v.id, v]));
        const rowErrors: string[] = [];

        // Handle creates & updates
        for (const v of submittedVars) {
          const val = v as any;
          try {
            const existingId = val.variantId || val.id;
            if (existingId && !String(existingId).startsWith('temp-')) {
              const dbV = dbVarsMap.get(existingId);
              const dbInv = Array.isArray(dbV?.inventory) ? dbV?.inventory?.[0] : dbV?.inventory;

              const variantChanged = !dbV ||
                val.sku !== dbV.sku ||
                (val.size_id || val.sizeId || null) !== dbV.size_id ||
                (val.color_id || val.colorId || null) !== dbV.color_id ||
                val.is_active !== dbV.is_active ||
                val.isActive !== dbV.is_active ||
                (val.shipping_weight_grams !== undefined && (val.shipping_weight_grams === null ? null : Number(val.shipping_weight_grams)) !== dbV.shipping_weight_grams);

              const inventoryChanged = !dbInv || (val.isQuantityEdited === true && Number(val.quantity) !== Number(dbInv.quantity));

              if (variantChanged) {
                const { error: varUpErr } = await supabase
                  .from('product_variants')
                  .update({
                    sku: val.sku,
                    size_id: val.sizeId || val.size_id || null,
                    color_id: val.colorId || val.color_id || null,
                    is_active: val.isActive !== false && val.is_active !== false,
                    is_default: false,
                    shipping_weight_grams: val.shipping_weight_grams !== undefined && val.shipping_weight_grams !== null ? Number(val.shipping_weight_grams) : null
                  })
                  .eq('id', existingId);

                if (varUpErr) throw varUpErr;
              }

              const qty = val.quantity ?? 0;

              if (inventoryChanged) {
                if (dbInv) {
                  const res = dbInv.reserved_quantity ?? 0;
                  const avail = Math.max(qty - res, 0);
                  const status = qty > 0 ? (qty <= 5 ? 'low_stock' : 'in_stock') : 'out_of_stock';
                  const { error: invUpErr } = await supabase
                    .from('inventory')
                    .update({
                      quantity: qty,
                      stock_status: status,
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', dbInv.id);

                  if (invUpErr) throw invUpErr;
                } else {
                  const status = qty > 0 ? (qty <= 5 ? 'low_stock' : 'in_stock') : 'out_of_stock';
                  const { error: invInsErr } = await supabase
                    .from('inventory')
                    .insert({
                      variant_id: existingId,
                      quantity: qty,
                      reserved_quantity: 0,
                      low_stock_threshold: 5,
                      reorder_level: 10,
                      warehouse_location: 'Rack A1',
                      stock_status: status
                    });

                  if (invInsErr) throw invInsErr;
                }
              }
            } else {
              // Create new variant
              if (val.isActive === false || val.isSizeRemoved === true) continue;

              const sizeName = val.sizeName || val.size || 'M';
              const colName = val.colorName || val.color_name || null;

              const rawSizeId = val.sizeId || val.size_id || null;
              let vSizeId = rawSizeId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawSizeId) ? rawSizeId : null;
              if (!vSizeId && sizeName) {
                const { data: sz } = await supabase.from('sizes').select('id').eq('name', sizeName).maybeSingle();
                if (sz) {
                  vSizeId = sz.id;
                } else {
                  const { data: newSz } = await supabase.from('sizes').insert({ name: sizeName, display_name: sizeName }).select().single();
                  if (newSz) vSizeId = newSz.id;
                }
              }

              let vColorId = val.colorId || val.color_id || data.primary_color_id || null;
              if (!vColorId && colName) {
                const { data: col } = await supabase.from('colors').select('id').eq('name', colName).maybeSingle();
                if (col) {
                  vColorId = col.id;
                } else {
                  const { data: newCol } = await supabase.from('colors').insert({ name: colName, slug: colName.toLowerCase(), hex_code: val.color_code || '#000000' }).select().single();
                  if (newCol) vColorId = newCol.id;
                }
              }
              if (!vColorId) {
                const { data: defaultCol } = await supabase.from('colors').select('id').limit(1).single();
                if (defaultCol) vColorId = defaultCol.id;
              }

              const qty = val.quantity ?? 0;
              const activeStatus = val.isActive !== false;

              const { data: existingVarCheck } = await supabase
                .from('product_variants')
                .select('id, inventory(*)')
                .eq('product_id', id)
                .eq('size_id', vSizeId)
                .eq('color_id', vColorId)
                .maybeSingle();

              if (existingVarCheck) {
                const { error: varUpErr } = await supabase
                  .from('product_variants')
                  .update({
                    sku: v.sku,
                    is_active: true,
                    is_default: false,
                    shipping_weight_grams: val.shipping_weight_grams !== undefined && val.shipping_weight_grams !== null ? Number(val.shipping_weight_grams) : null
                  })
                  .eq('id', existingVarCheck.id);

                if (varUpErr) throw varUpErr;

                const dbInv = Array.isArray(existingVarCheck.inventory) ? existingVarCheck.inventory[0] : existingVarCheck.inventory;
                if (dbInv) {
                  const res = dbInv.reserved_quantity ?? 0;
                  const status = qty > 0 ? (qty <= 5 ? 'low_stock' : 'in_stock') : 'out_of_stock';
                  const { error: invUpErr } = await supabase
                    .from('inventory')
                    .update({
                      quantity: qty,
                      stock_status: status,
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', dbInv.id);

                  if (invUpErr) throw invUpErr;
                } else {
                  const status = qty > 0 ? 'in_stock' : 'out_of_stock';
                  const { error: invInsErr } = await supabase
                    .from('inventory')
                    .insert({
                      variant_id: existingVarCheck.id,
                      quantity: qty,
                      reserved_quantity: 0,
                      low_stock_threshold: 5,
                      reorder_level: 10,
                      warehouse_location: 'Rack A1',
                      stock_status: status
                    });

                  if (invInsErr) throw invInsErr;
                }
              } else {
                const { data: newVar, error: varInsErr } = await supabase
                  .from('product_variants')
                  .insert({
                    product_id: id,
                    sku: v.sku,
                    size_id: vSizeId,
                    color_id: vColorId,
                    is_default: false,
                    is_active: activeStatus,
                    shipping_weight_grams: val.shipping_weight_grams !== undefined && val.shipping_weight_grams !== null ? Number(val.shipping_weight_grams) : null
                  })
                  .select()
                  .single();

                if (varInsErr || !newVar) throw varInsErr || new Error('Failed to insert variant.');

                const { error: invInsErr } = await supabase
                  .from('inventory')
                  .insert({
                    variant_id: newVar.id,
                    quantity: qty,
                    reserved_quantity: 0,
                    low_stock_threshold: 5,
                    reorder_level: 10,
                    warehouse_location: 'Rack A1',
                    stock_status: qty > 0 ? 'in_stock' : 'out_of_stock'
                  });

                if (invInsErr) throw invInsErr;
              }
            }
          } catch (err: any) {
            const op = (val.variantId || val.id) ? 'update' : 'insert';
            console.error('[VARIANT-MUTATION-FAILED]', {
              productId: id,
              variantId: val.variantId || val.id || null,
              inventoryId: val.inventoryId || null,
              sizeId: val.sizeId || val.size_id || null,
              operation: op,
              message: err.message || String(err),
              code: err.code || null,
              details: err.details || null,
              hint: err.hint || null
            });
            throw err;
          }
        }
      } catch (err: any) {
        console.error('Failed to reconcile product variants:', err.message);
        return { success: false, error: err.message };
      }
    } else if (data.stock_quantity !== undefined) {
      // Find the default variant
      let defaultVariantId = null;
      const { data: defaultVar, error: varFetchErr } = await supabase
        .from('product_variants')
        .select('id')
        .eq('product_id', id)
        .eq('is_default', true)
        .maybeSingle();

      if (varFetchErr) {
        console.error('Failed to query default variant during update:', varFetchErr.message);
        warning = (warning ? warning + ' ' : '') + 'Failed to fetch variant details to update stock.';
      } else if (defaultVar) {
        defaultVariantId = defaultVar.id;
      } else {
        // Safe Recovery: If this simple product lacks a default variant, let's create it!
        try {
          let sizeId = null;
          const { data: sz } = await supabase.from('sizes').select('id').eq('name', 'One Size').maybeSingle();
          if (sz) sizeId = sz.id;
          else {
            const { data: newSz } = await supabase.from('sizes').insert({ name: 'One Size', display_name: 'One Size' }).select().single();
            if (newSz) sizeId = newSz.id;
          }

          let colorId = null;
          const { data: col } = await supabase.from('colors').select('id').eq('slug', 'default').maybeSingle();
          if (col) colorId = col.id;
          else {
            const { data: newCol } = await supabase.from('colors').insert({ name: 'Default', slug: 'default', hex_code: '#E5DDC8' }).select().single();
            if (newCol) colorId = newCol.id;
          }

          const { data: dv, error: dvErr } = await supabase
            .from('product_variants')
            .insert({
              product_id: id,
              sku: `${updatedRecord.sku}-DEF`,
              size_id: sizeId,
              color_id: colorId,
              is_default: true,
              is_active: true
            })
            .select()
            .single();

          if (dvErr) throw dvErr;
          if (dv) defaultVariantId = dv.id;
        } catch (recoveryErr: any) {
          console.error('Auto-remedy variant creation failed:', recoveryErr.message);
          warning = (warning ? warning + ' ' : '') + 'Stock could not be updated because default variant is missing and auto-recreation failed.';
        }
      }

      if (defaultVariantId) {
        // We must update public.inventory row. First let's check if it exists.
        const { data: invCheck, error: invCheckErr } = await supabase
          .from('inventory')
          .select('id, quantity, reserved_quantity')
          .eq('variant_id', defaultVariantId)
          .maybeSingle();

        if (invCheckErr) {
          console.error('Failed to check inventory row:', invCheckErr.message);
          warning = (warning ? warning + ' ' : '') + 'Failed to check inventory record.';
        } else if (invCheck) {
          // Update existing inventory, preserve reserved_quantity
          const { error: invUpErr } = await supabase
            .from('inventory')
            .update({
              quantity: data.stock_quantity,
              stock_status: data.stock_quantity > 0 ? 'in_stock' : 'out_of_stock',
              updated_at: new Date().toISOString()
            })
            .eq('id', invCheck.id);

          if (invUpErr) {
            console.error('Failed to update inventory quantity:', invUpErr.message);
            warning = (warning ? warning + ' ' : '') + 'Failed to update stock quantity.';
          } else {
            // Write to activity logs
            await supabase.from('activity_logs').insert({
              action: 'inventory.stock_updated',
              module: 'inventory',
              details: { 
                product_id: id, 
                variant_id: defaultVariantId, 
                previous_stock: invCheck.quantity, 
                new_stock: data.stock_quantity,
                reason: 'Product Edit Form Update'
              },
            });
          }
        } else {
          // Create missing inventory row
          const { error: invInsErr } = await supabase
            .from('inventory')
            .insert({
              variant_id: defaultVariantId,
              quantity: data.stock_quantity,
              reserved_quantity: 0,
              low_stock_threshold: 5,
              reorder_level: 10,
              warehouse_location: 'Rack A1',
              stock_status: data.stock_quantity > 0 ? 'in_stock' : 'out_of_stock'
            });

          if (invInsErr) {
            console.error('Failed to create missing inventory row:', invInsErr.message);
            warning = (warning ? warning + ' ' : '') + 'Failed to initialize missing stock record.';
          }
        }
      }
    }

    await supabase.from('activity_logs').insert({
      action: 'catalog.product_updated',
      module: 'products',
      details: { product_id: id, sku: updatedRecord.sku },
    });

    // Verify saved inventory results
    if (data.variants && data.variants.length > 0) {
      const { data: verifyInv } = await supabase
        .from('product_variants')
        .select('*, inventory(*)')
        .eq('product_id', id)
      
      const verifyInvMap = new Map(verifyInv?.map(v => [v.size_id, v]))
      
      for (const submittedV of data.variants) {
        if (submittedV.isActive !== false && !submittedV.isSizeRemoved) {
          const matchedDbV = verifyInvMap.get(submittedV.sizeId)
          const matchedInv = matchedDbV?.inventory ? (Array.isArray(matchedDbV.inventory) ? matchedDbV.inventory[0] : matchedDbV.inventory) : null
          
          if (!matchedInv) {
            console.warn(`[Verification Alert] Inventory record missing for size ID: ${submittedV.sizeId}`)
          } else if (submittedV.isQuantityEdited && Number(matchedInv.quantity) !== Number(submittedV.quantity)) {
            console.error(`[Verification Error] Quantity mismatch! Submitted: ${submittedV.quantity}, Saved: ${matchedInv.quantity}`)
          }
        }
      }
    }

    const mappedProduct = mapDbToAdminProduct({
      ...updatedRecord,
      product_images: finalImages || []
    })

    return { success: true, productId: updatedRecord.id, product: mappedProduct, images: finalImages, warning }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update product.' }
  }
}

export async function getCategories(): Promise<Category[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('display_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching categories:', error.message)
    throw new Error(`Failed to load categories: ${error.message}`)
  }

  return (data || []) as Category[]
}

export async function deleteProduct(id: string): Promise<{ success: boolean; isArchived?: boolean; message?: string; error?: string }> {
  try {
    const supabase = createAdminClient()

    // 1. Execute atomic PostgreSQL transaction via RPC
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('delete_product_safely', { target_product_id: id })

    if (!rpcErr && rpcRes && typeof rpcRes === 'object') {
      const success = !!rpcRes.success
      if (success) {
        await supabase.from('activity_logs').insert({
          action: rpcRes.is_archived ? 'catalog.product_archived' : 'catalog.product_deleted',
          module: 'products',
          details: { product_id: id, is_archived: rpcRes.is_archived }
        })
        return {
          success: true,
          isArchived: !!rpcRes.is_archived,
          message: rpcRes.message || (rpcRes.is_archived ? 'Product archived.' : 'Product deleted.')
        }
      }
      return { success: false, error: rpcRes.error || 'Failed to delete product.' }
    }

    // 2. Transaction fallback if RPC function is pending remote deployment
    const { data: variants } = await supabase
      .from('product_variants')
      .select('id')
      .eq('product_id', id)

    const variantIds = (variants || []).map(v => v.id)

    let orderCount = 0
    const { count: directOrderCount, error: orderErr } = await supabase
      .from('order_items')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', id)

    if (!orderErr && directOrderCount) {
      orderCount += directOrderCount
    }

    if (variantIds.length > 0 && orderCount === 0) {
      const { count: variantOrderCount } = await supabase
        .from('order_items')
        .select('id', { count: 'exact', head: true })
        .in('variant_id', variantIds)

      if (variantOrderCount) {
        orderCount += variantOrderCount
      }
    }

    if (orderCount > 0) {
      const { error: archiveErr } = await supabase
        .from('products')
        .update({ is_active: false, status: 'inactive', updated_at: new Date().toISOString() })
        .eq('id', id)

      if (archiveErr) {
        return { success: false, error: `Failed to archive product: ${archiveErr.message}` }
      }

      await supabase.from('activity_logs').insert({
        action: 'catalog.product_archived',
        module: 'products',
        details: { product_id: id, reason: 'Preserved order history' }
      })

      return {
        success: true,
        isArchived: true,
        message: 'This product is linked to existing customer orders and cannot be permanently deleted. It has been archived instead.'
      }
    }

    if (variantIds.length > 0) {
      await supabase.from('inventory').delete().in('variant_id', variantIds)
      await supabase.from('cart_items').delete().in('variant_id', variantIds)
      await supabase.from('wishlist').delete().in('variant_id', variantIds)
    }

    await supabase.from('cart_items').delete().eq('product_id', id)
    await supabase.from('reviews').delete().eq('product_id', id)
    await supabase.from('product_images').delete().eq('product_id', id)
    await supabase.from('product_variants').delete().eq('product_id', id)

    const { error: deleteErr } = await supabase
      .from('products')
      .delete()
      .eq('id', id)

    if (deleteErr) {
      return { success: false, error: `Failed to delete product record: ${deleteErr.message}` }
    }

    await supabase.from('activity_logs').insert({
      action: 'catalog.product_deleted',
      module: 'products',
      details: { product_id: id }
    })

    return { success: true, isArchived: false, message: 'Product and associated records permanently deleted.' }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete product.' }
  }
}

export async function createCategory(data: CategoryInput): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const supabase = createAdminClient()
    const { data: newRecord, error } = await supabase
      .from('categories')
      .insert(data)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    await supabase.from('activity_logs').insert({
      action: 'catalog.category_created',
      module: 'categories',
      details: { category_id: newRecord.id, name: newRecord.name },
    })

    return { success: true, data: newRecord }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create category.' }
  }
}

export async function updateCategory(id: string, data: Partial<CategoryInput>): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const supabase = createAdminClient()
    
    // 1. Fetch current category record to find the old image_url
    const { data: oldCategory } = await supabase
      .from('categories')
      .select('image_url')
      .eq('id', id)
      .maybeSingle()

    // 2. Perform the update in the database first
    const { data: updatedRecord, error } = await supabase
      .from('categories')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    // 3. Delete old storage object only after successful database update
    if (oldCategory?.image_url && data.image_url && oldCategory.image_url !== data.image_url) {
      const urlParts = oldCategory.image_url.split('/products/')
      if (urlParts.length > 1) {
        const oldStoragePath = urlParts[1]
        try {
          await supabase.storage.from('products').remove([oldStoragePath])
        } catch (storageErr) {
          console.error('Failed to remove old category image from storage:', storageErr)
        }
      }
    }

    await supabase.from('activity_logs').insert({
      action: 'catalog.category_updated',
      module: 'categories',
      details: { category_id: id, name: updatedRecord.name },
    })

    return { success: true, data: updatedRecord }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update category.' }
  }
}

export async function deleteCategory(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()

    // 1. Fetch category first to find any associated storage image
    const { data: category } = await supabase
      .from('categories')
      .select('image_url')
      .eq('id', id)
      .maybeSingle()

    // 2. Delete the database record
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)

    if (error) {
      return { success: false, error: error.message }
    }

    // 3. Remove image from storage only after successful database deletion
    if (category?.image_url) {
      const urlParts = category.image_url.split('/products/')
      if (urlParts.length > 1) {
        const oldStoragePath = urlParts[1]
        try {
          await supabase.storage.from('products').remove([oldStoragePath])
        } catch (storageErr) {
          console.error('Failed to remove category image from storage:', storageErr)
        }
      }
    }

    await supabase.from('activity_logs').insert({
      action: 'catalog.category_deleted',
      module: 'categories',
      details: { category_id: id },
    })

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete category.' }
  }
}

export async function createCollection(data: CollectionInput): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const supabase = createAdminClient()
    const { data: newRecord, error } = await supabase
      .from('collections')
      .insert(data)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    await supabase.from('activity_logs').insert({
      action: 'catalog.collection_created',
      module: 'collections',
      details: { collection_id: newRecord.id, name: newRecord.name },
    })

    return { success: true, data: newRecord }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create collection.' }
  }
}

export async function updateCollection(id: string, data: Partial<CollectionInput>): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const supabase = createAdminClient()
    const { data: updatedRecord, error } = await supabase
      .from('collections')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    await supabase.from('activity_logs').insert({
      action: 'catalog.collection_updated',
      module: 'collections',
      details: { collection_id: id, name: updatedRecord.name },
    })

    return { success: true, data: updatedRecord }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update collection.' }
  }
}

export async function deleteCollection(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('collections')
      .delete()
      .eq('id', id)

    if (error) {
      return { success: false, error: error.message }
    }

    await supabase.from('activity_logs').insert({
      action: 'catalog.collection_deleted',
      module: 'collections',
      details: { collection_id: id },
    })

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete collection.' }
  }
}

export async function getAdminCollections(): Promise<Collection[]> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('collections')
      .select(`
        *,
        product_collections (
          product_id
        )
      `)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('[DATABASE-ERROR] getAdminCollections failed:', error.message, error.details)
      return []
    }

    return (data || []).map((row: any) => ({
      ...row,
      product_count: row.product_collections ? row.product_collections.length : 0
    })) as Collection[]
  } catch (err: any) {
    console.error('[UNEXPECTED-ERROR] getAdminCollections failed:', err.message || err)
    return []
  }
}

export async function getCollectionProductsForAdmin(collectionId: string): Promise<any[]> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('product_collections')
      .select(`
        sort_order,
        products (
          id,
          name,
          slug,
          status,
          is_active,
          selling_price
        )
      `)
      .eq('collection_id', collectionId)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('[DATABASE-ERROR] getCollectionProductsForAdmin failed:', error.message, error.details)
      return []
    }

    return (data || []).map((item: any) => ({
      id: item.products?.id,
      title: item.products?.name || '',
      name: item.products?.name || '',
      slug: item.products?.slug,
      status: item.products?.status,
      is_active: item.products?.is_active,
      price: item.products?.selling_price,
      sort_order: item.sort_order
    })).filter(p => p.id)
  } catch (err: any) {
    console.error('[UNEXPECTED-ERROR] getCollectionProductsForAdmin failed:', err.message || err)
    return []
  }
}

export async function updateCollectionProductAssignments(
  collectionId: string, 
  assignments: { product_id: string; sort_order: number }[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()
    
    // 1. Fetch currently assigned product IDs to know what is removed
    const { data: currentAssigned } = await supabase
      .from('product_collections')
      .select('product_id')
      .eq('collection_id', collectionId)
      
    const currentIds = currentAssigned ? currentAssigned.map((r: any) => r.product_id) : []
    const newIds = assignments.map(a => a.product_id)
    
    // Identifies removed product IDs
    const removedIds = currentIds.filter(id => !newIds.includes(id))
    
    // 2. Delete existing join table assignments
    const { error: deleteError } = await supabase
      .from('product_collections')
      .delete()
      .eq('collection_id', collectionId)
      
    if (deleteError) {
      return { success: false, error: deleteError.message }
    }
    
    // 3. Insert new join table assignments
    if (assignments.length > 0) {
      const rows = assignments.map(a => ({
        collection_id: collectionId,
        product_id: a.product_id,
        sort_order: a.sort_order
      }))
      
      const { error: insertError } = await supabase
        .from('product_collections')
        .insert(rows)
        
      if (insertError) {
        return { success: false, error: insertError.message }
      }
      
      // Update collection_id on assigned products
      const { error: updateProductsError } = await supabase
        .from('products')
        .update({ collection_id: collectionId })
        .in('id', newIds)
        
      if (updateProductsError) {
        console.error('Failed to sync collection_id on products:', updateProductsError)
      }
    }
    
    // 4. Set collection_id to NULL on removed products (only if it was set to this collection)
    if (removedIds.length > 0) {
      const { error: clearProductsError } = await supabase
        .from('products')
        .update({ collection_id: null })
        .in('id', removedIds)
        .eq('collection_id', collectionId)
        
      if (clearProductsError) {
        console.error('Failed to clear collection_id on removed products:', clearProductsError)
      }
    }
    
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update assignments.' }
  }
}

export function getStoragePathFromUrl(url: string, bucket: string = 'products'): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`
  const index = url.indexOf(marker)
  if (index !== -1) {
    return url.slice(index + marker.length)
  }
  return null
}

export async function deleteProductImage(imageId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()
    
    // 1. Fetch image record
    const { data: record, error: fetchError } = await supabase
      .from('product_images')
      .select('*')
      .eq('id', imageId)
      .maybeSingle()

    if (fetchError || !record) {
      return { success: false, error: fetchError?.message || 'Image not found.' }
    }

    // 2. Delete storage object if storage_path exists
    if (record.storage_path) {
      const { error: storageError } = await supabase.storage
        .from('products')
        .remove([record.storage_path])
      if (storageError) {
        console.error('Storage deletion warning:', storageError.message)
      }
    }

    // 3. Delete database record
    const { error: dbError } = await supabase
      .from('product_images')
      .delete()
      .eq('id', imageId)

    if (dbError) {
      return { success: false, error: dbError.message }
    }



    await supabase.from('activity_logs').insert({
      action: 'catalog.image_deleted',
      module: 'products',
      details: { image_id: imageId, product_id: record.product_id },
    })

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete image.' }
  }
}

export async function reorderProductImages(
  productId: string,
  orderedImageUrls: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()

    // 1. Fetch current database images for this product
    const { data: dbImages } = await supabase
      .from('product_images')
      .select('*')
      .eq('product_id', productId)

    if (!dbImages) {
      return { success: false, error: 'Product images not found.' }
    }

    // 2. Clear old database entries and insert new ones in the ordered arrangement
    await supabase.from('product_images').delete().eq('product_id', productId)

    const imgInserts = orderedImageUrls.map((url: string, idx: number) => {
      const existing = dbImages.find(img => img.image_url === url)
      const path = existing ? existing.storage_path : getStoragePathFromUrl(url, 'products')
      return {
        product_id: productId,
        image_url: url,
        storage_path: path,
        display_order: idx,
        is_featured: idx === 0,
        alt_text: `Product image - ${idx + 1}`
      }
    })

    await supabase.from('product_images').insert(imgInserts)



    await supabase.from('activity_logs').insert({
      action: 'catalog.images_reordered',
      module: 'products',
      details: { product_id: productId },
    })

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to reorder images.' }
  }
}

export async function setProductFeaturedImage(
  productId: string,
  featuredImageUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()

    // 1. Fetch current database images
    const { data: dbImages } = await supabase
      .from('product_images')
      .select('image_url')
      .eq('product_id', productId)
      .order('display_order', { ascending: true })

    if (!dbImages) {
      return { success: false, error: 'Product images not found.' }
    }

    const imageUrls = dbImages.map(img => img.image_url)
    const index = imageUrls.indexOf(featuredImageUrl)
    if (index === -1) {
      return { success: false, error: 'Selected image not found on product.' }
    }

    // Move selected image to index 0 (Featured)
    imageUrls.splice(index, 1)
    imageUrls.unshift(featuredImageUrl)

    // 2. Perform re-ordering
    return await reorderProductImages(productId, imageUrls)
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to set featured image.' }
  }
}






export async function createVariant(data: VariantInput): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const supabase = createAdminClient()
    
    // Check unique SKU
    const { data: existingSku } = await supabase
      .from('product_variants')
      .select('id')
      .eq('sku', data.sku)
      .maybeSingle()

    if (existingSku) {
      return { success: false, error: 'A variant with this SKU code already exists.' }
    }

    // Resolve size and color to IDs
    let sizeId = null
    if (data.size) {
      const { data: sz } = await supabase.from('sizes').select('id').eq('name', data.size).maybeSingle()
      if (sz) {
        sizeId = sz.id
      } else {
        const { data: newSz } = await supabase.from('sizes').insert({ name: data.size, display_name: data.size }).select().single()
        if (newSz) sizeId = newSz.id
      }
    }

    let colorId = null
    if (data.color_name) {
      const { data: col } = await supabase.from('colors').select('id').eq('name', data.color_name).maybeSingle()
      if (col) {
        colorId = col.id
      } else {
        const { data: newCol } = await supabase.from('colors').insert({ name: data.color_name, slug: data.color_name.toLowerCase(), hex_code: data.color_code || '#000000' }).select().single()
        if (newCol) colorId = newCol.id
      }
    }

    const { data: newVariant, error: varError } = await supabase
      .from('product_variants')
      .insert({
        product_id: data.product_id,
        sku: data.sku,
        size_id: sizeId,
        color_id: colorId,
        selling_price: data.price_override
      })
      .select()
      .single()

    if (varError || !newVariant) {
      return { success: false, error: varError?.message || 'Failed to create variant record.' }
    }

    const { error: invError } = await supabase
      .from('inventory')
      .insert({
        variant_id: newVariant.id,
        quantity: data.stock_quantity,
        reorder_level: 5,
        warehouse_location: 'Rack A1'
      })

    if (invError) {
      // Rollback variant insert to maintain integrity
      await supabase.from('product_variants').delete().eq('id', newVariant.id)
      return { success: false, error: invError.message }
    }

    await supabase.from('activity_logs').insert({
      action: 'catalog.variant_created',
      module: 'variants',
      details: { variant_id: newVariant.id, sku: newVariant.sku }
    })

    return { success: true, data: newVariant }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create variant.' }
  }
}

export async function updateVariant(
  id: string,
  data: Partial<VariantInput>
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const supabase = createAdminClient()
    
    // If SKU is being updated, check uniqueness
    if (data.sku) {
      const { data: existingSku } = await supabase
        .from('product_variants')
        .select('id')
        .eq('sku', data.sku)
        .neq('id', id)
        .maybeSingle()

      if (existingSku) {
        return { success: false, error: 'A variant with this SKU code already exists.' }
      }
    }

    const variantUpdate: any = {}
    if (data.sku !== undefined) variantUpdate.sku = data.sku
    if (data.price_override !== undefined) variantUpdate.selling_price = data.price_override

    if (data.size !== undefined) {
      const { data: sz } = await supabase.from('sizes').select('id').eq('name', data.size).maybeSingle()
      if (sz) {
        variantUpdate.size_id = sz.id
      } else {
        const { data: newSz } = await supabase.from('sizes').insert({ name: data.size, display_name: data.size }).select().single()
        if (newSz) variantUpdate.size_id = newSz.id
      }
    }

    if (data.color_name !== undefined) {
      const { data: col } = await supabase.from('colors').select('id').eq('name', data.color_name).maybeSingle()
      if (col) {
        variantUpdate.color_id = col.id
      } else {
        const { data: newCol } = await supabase.from('colors').insert({ name: data.color_name, slug: data.color_name.toLowerCase(), hex_code: data.color_code || '#000000' }).select().single()
        if (newCol) variantUpdate.color_id = newCol.id
      }
    }

    if (Object.keys(variantUpdate).length > 0) {
      const { error: varError } = await supabase
        .from('product_variants')
        .update(variantUpdate)
        .eq('id', id)

      if (varError) {
        return { success: false, error: varError.message }
      }
    }

    // Update inventory quantity if provided
    if (data.stock_quantity !== undefined) {
      const { error: invError } = await supabase
        .from('inventory')
        .update({
          quantity: data.stock_quantity,
          updated_at: new Date().toISOString()
        })
        .eq('variant_id', id)

      if (invError) {
        return { success: false, error: invError.message }
      }
    }

    await supabase.from('activity_logs').insert({
      action: 'catalog.variant_updated',
      module: 'variants',
      details: { variant_id: id }
    })

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update variant.' }
  }
}

export async function deleteVariant(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()
    
    // 1. Check order items (if order_items table exists)
    let orderItems = null
    try {
      const { data } = await supabase
        .from('order_items')
        .select('id')
        .eq('variant_id', id)
        .limit(1)
      orderItems = data
    } catch {}

    if (orderItems && orderItems.length > 0) {
      return { success: false, error: 'Cannot delete variant because it is attached to active orders.' }
    }

    // 2. Check reservations
    const { data: reservations } = await supabase
      .from('inventory')
      .select('reserved_stock')
      .eq('variant_id', id)
      .maybeSingle()

    if (reservations && (reservations.reserved_stock || 0) > 0) {
      return { success: false, error: 'Cannot delete variant because it has active stock reservations.' }
    }

    // 3. Delete inventory row
    const { error: invDelError } = await supabase
      .from('inventory')
      .delete()
      .eq('variant_id', id)

    if (invDelError) {
      return { success: false, error: invDelError.message }
    }

    // 4. Delete variant record
    const { error: varDelError } = await supabase
      .from('product_variants')
      .delete()
      .eq('id', id)

    if (varDelError) {
      return { success: false, error: varDelError.message }
    }

    await supabase.from('activity_logs').insert({
      action: 'catalog.variant_deleted',
      module: 'variants',
      details: { variant_id: id }
    })

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete variant.' }
  }
}




export async function updateInventory(
  id: string,
  data: { reorder_level?: number; warehouse_location?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()
    const updateData: any = {}
    if (data.reorder_level !== undefined) {
      updateData.reorder_level = data.reorder_level
      updateData.low_stock_threshold = data.reorder_level
    }
    if (data.warehouse_location !== undefined) updateData.warehouse_location = data.warehouse_location
    
    const { error } = await supabase
      .from('inventory')
      .update(updateData)
      .eq('id', id)

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function adjustInventory(
  inventoryId: string,
  quantity: number,
  type: 'delta' | 'exact',
  reason: string,
  adminUserId: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()
    
    // 1. Fetch current quantity
    const { data: record, error: fetchErr } = await supabase
      .from('inventory')
      .select('*')
      .eq('id', inventoryId)
      .maybeSingle()

    if (fetchErr || !record) {
      return { success: false, error: fetchErr?.message || 'Inventory record not found.' }
    }

    const previousQuantity = record.quantity || 0
    let newQuantity = previousQuantity

    if (type === 'delta') {
      newQuantity = previousQuantity + quantity
    } else {
      newQuantity = quantity
    }

    if (newQuantity < 0) {
      return { success: false, error: 'Cannot reduce stock quantity below zero.' }
    }

    const changeAmount = newQuantity - previousQuantity

    // 2. Update quantity in database
    const { error: updateErr } = await supabase
      .from('inventory')
      .update({
        quantity: newQuantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', inventoryId)

    if (updateErr) {
      return { success: false, error: updateErr.message }
    }

    // 3. Create inventory transactions record (history)
    try {
      await supabase
        .from('inventory_transactions')
        .insert({
          inventory_id: inventoryId,
          variant_id: record.variant_id,
          previous_quantity: previousQuantity,
          new_quantity: newQuantity,
          change_amount: changeAmount,
          reason: reason,
          admin_user_id: adminUserId
        })
    } catch (logErr) {
      console.error('Failed to log inventory transaction:', logErr)
    }

    // 4. Log in general activity logs
    await supabase.from('activity_logs').insert({
      action: 'inventory.adjusted',
      module: 'inventory',
      details: {
        inventory_id: inventoryId,
        previous_quantity: previousQuantity,
        new_quantity: newQuantity,
        reason
      }
    })

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to adjust inventory.' }
  }
}

export async function getProductFamilies(options?: { activeOnly?: boolean }): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const supabase = createAdminClient()
    let query = supabase
      .from('product_families')
      .select('*, category:categories(name)')
      .order('name', { ascending: true })

    if (options?.activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
      if (error.message.includes('product_families') || error.code === 'PGRST204' || error.code === '42P01') {
        return { success: false, error: 'Product Family features are unavailable because the required database migration has not been applied.' }
      }
      return { success: false, error: error.message }
    }
    const mapped = (data || []).map((f: any) => ({
      id: f.id,
      name: f.name,
      category_id: f.category_id || null,
      categoryId: f.category_id || null,
      categoryName: f.category?.name || null,
      internal_reference: f.internal_reference || null,
      internalReference: f.internal_reference || null,
      is_active: f.is_active !== false,
      isActive: f.is_active !== false,
      created_at: f.created_at,
      createdAt: f.created_at,
      updated_at: f.updated_at,
      updatedAt: f.updated_at
    }))
    return { success: true, data: mapped }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch product families.' }
  }
}

export async function createProductFamily(
  name: string,
  categoryId?: string | null,
  internalRef?: string | null,
  isActive: boolean = true
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const supabase = createAdminClient()

    // 1. Trim the name
    const cleanName = name ? name.trim() : ''
    if (!cleanName) {
      return { success: false, error: 'Enter a Product Family name.' }
    }

    // 2. Validate category UUID if provided
    let cleanCategoryId: string | null = null
    if (categoryId) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(categoryId)
      if (!isUuid) {
        return { success: false, error: 'Select a valid category.' }
      }
      
      // Verify category exists
      const { data: catExists, error: catErr } = await supabase
        .from('categories')
        .select('id')
        .eq('id', categoryId)
        .maybeSingle()

      if (catErr || !catExists) {
        return { success: false, error: 'The selected category no longer exists.' }
      }
      cleanCategoryId = categoryId
    }

    // 3. Prevent duplicate family names within the same category
    let dupQuery = supabase
      .from('product_families')
      .select('id')
      .eq('name', cleanName)
    
    if (cleanCategoryId) {
      dupQuery = dupQuery.eq('category_id', cleanCategoryId)
    } else {
      dupQuery = dupQuery.is('category_id', null)
    }

    const { data: existingFam, error: dupErr } = await dupQuery.maybeSingle()
    if (dupErr) {
      console.error('Error checking duplicate family name:', dupErr)
      return { success: false, error: 'Unable to create the Product Family.' }
    }

    if (existingFam) {
      return { success: false, error: 'A Product Family with this name already exists in this category.' }
    }

    // 4. Insert the family (automatic UUID generation is handled by the database default)
    const { data, error } = await supabase
      .from('product_families')
      .insert({
        name: cleanName,
        category_id: cleanCategoryId,
        internal_reference: internalRef ? internalRef.trim() : null,
        is_active: isActive
      })
      .select(`
        id,
        name,
        category_id,
        internal_reference,
        is_active,
        created_at,
        updated_at
      `)
      .single()

    if (error) {
      console.error('Error inserting product family:', error)
      return { success: false, error: 'Unable to create the Product Family.' }
    }

    // Return mapped object supporting both database snake_case and type camelCase keys
    const mapped = {
      id: data.id,
      name: data.name,
      category_id: data.category_id,
      categoryId: data.category_id,
      internal_reference: data.internal_reference,
      internalReference: data.internal_reference,
      is_active: data.is_active,
      isActive: data.is_active,
      created_at: data.created_at,
      createdAt: data.created_at,
      updated_at: data.updated_at,
      updatedAt: data.updated_at
    }

    return { success: true, data: mapped }
  } catch (err: any) {
    console.error('Unexpected error in createProductFamily:', err)
    return { success: false, error: 'Unable to create the Product Family.' }
  }
}

export async function unlinkProductFromFamily(productId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('products')
      .update({ product_family_id: null, updated_at: new Date().toISOString() })
      .eq('id', productId)

    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to unlink product from family.' }
  }
}

export async function linkProductToFamily(
  productId: string,
  familyId: string,
  primaryColorId?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()
    
    // Check product and family categories
    const { data: prod } = await supabase.from('products').select('id, category_id, primary_color_id').eq('id', productId).single()
    const { data: family } = await supabase.from('product_families').select('id, category_id').eq('id', familyId).single()

    if (!prod || !family) {
      return { success: false, error: 'Product or Product Family not found.' }
    }

    if (family.category_id && prod.category_id && family.category_id !== prod.category_id) {
      return { success: false, error: 'This product category does not match the selected product family.' }
    }

    // If family has no category set yet, establish it from first linked product
    if (!family.category_id && prod.category_id) {
      await supabase.from('product_families').update({ category_id: prod.category_id }).eq('id', familyId)
    }

    // Check for duplicate primary_color_id in same family
    const colorToUse = primaryColorId || prod.primary_color_id
    if (colorToUse) {
      const { data: existingSameColor } = await supabase
        .from('products')
        .select('id, name')
        .eq('product_family_id', familyId)
        .eq('primary_color_id', colorToUse)
        .eq('is_active', true)
        .neq('id', productId)
        .limit(1)

      if (existingSameColor && existingSameColor.length > 0) {
        return { success: false, error: `Another active product in this family already uses this primary colour (${existingSameColor[0].name}).` }
      }
    }

    const updates: any = {
      product_family_id: familyId,
      updated_at: new Date().toISOString()
    }
    if (primaryColorId !== undefined) {
      updates.primary_color_id = primaryColorId || null
    }

    const { error } = await supabase.from('products').update(updates).eq('id', productId)
    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to link product to family.' }
  }
}

export async function duplicateProductAsColourway(
  sourceProductId: string,
  newPrimaryColorId: string,
  newColorName: string,
  newTitle: string,
  newSkuPrefix: string,
  copyImages: boolean = false
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const supabase = createAdminClient()

    // Check if source product has a family
    const { data: sourceProd, error: sourceErr } = await supabase
      .from('products')
      .select('product_family_id')
      .eq('id', sourceProductId)
      .single()

    if (sourceErr) {
      return { success: false, error: 'Source product not found.' }
    }

    if (sourceProd?.product_family_id) {
      // Check if duplicate colourway exists in the same family
      const { data: dupColorway } = await supabase
        .from('products')
        .select('id')
        .eq('product_family_id', sourceProd.product_family_id)
        .eq('primary_color_id', newPrimaryColorId)
        .maybeSingle()

      if (dupColorway) {
        const { data: colorRow } = await supabase
          .from('colors')
          .select('name')
          .eq('id', newPrimaryColorId)
          .maybeSingle()
        const colorNameText = colorRow?.name || 'selected'
        return { success: false, error: `A ${colorNameText} colourway already exists in this Product Family.` }
      }
    }

    // 1. Call atomic single-transaction RPC
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('create_product_colourway_atomic', {
      p_source_product_id: sourceProductId,
      p_primary_color_id: newPrimaryColorId,
      p_color_name: newColorName || null,
      p_title: newTitle || null,
      p_sku_prefix: newSkuPrefix || null,
      p_copy_images: copyImages
    })

    if (rpcErr) {
      return { success: false, error: rpcErr.message || 'Failed to create colourway atomically.' }
    }

    const createdRow = Array.isArray(rpcRes) ? rpcRes[0] : rpcRes
    if (!createdRow || !createdRow.new_product_id) {
      return { success: false, error: 'Atomic colourway creation returned no product data.' }
    }

    // 2. Fetch created product model
    const { data: newProd, error: fetchErr } = await supabase
      .from('products')
      .select('*')
      .eq('id', createdRow.new_product_id)
      .single()

    if (fetchErr || !newProd) {
      return { success: false, error: 'Colourway was created, but failed to fetch product data.' }
    }

    return { success: true, data: newProd }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to duplicate product as colourway.' }
  }
}

export async function deleteProductFamily(familyId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()

    // Safety check: verify no products are currently linked to this family
    const { count, error: countErr } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('product_family_id', familyId)

    if (countErr) {
      return { success: false, error: 'Database error checking family products.' }
    }

    if (count && count > 0) {
      return {
        success: false,
        error: `Cannot delete product family. It has ${count} linked products. Please unlink all products before deleting the family.`
      }
    }

    const { error } = await supabase.from('product_families').delete().eq('id', familyId)
    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete product family.' }
  }
}

export type SizeOption = {
  id: string
  name: string
  code: string | null
  sortOrder: number
  isActive: boolean
  display_name?: string | null
  display_order?: number
  is_active?: boolean
}

export async function getSizes(): Promise<{ data?: SizeOption[]; error?: string }> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('sizes')
      .select('id, name, display_name, display_order, is_active')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      return { error: error.message }
    }
    const sizes: SizeOption[] = (data || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      code: s.display_name || s.name,
      sortOrder: s.display_order ?? 0,
      isActive: s.is_active !== false,
      display_name: s.display_name,
      display_order: s.display_order,
      is_active: s.is_active
    }))
    return { data: sizes }
  } catch (err: any) {
    return { error: err.message || 'Failed to fetch sizes.' }
  }
}

export async function generateProductSku(categoryId?: string | null, colorId?: string | null): Promise<{ sku: string; error?: string }> {
  try {
    const supabase = createAdminClient()

    let catName = 'Kurti'
    let catSlug = 'kurti'
    if (categoryId) {
      const { data: cat } = await supabase.from('categories').select('name, slug').eq('id', categoryId).maybeSingle()
      if (cat) {
        catName = cat.name || 'Kurti'
        catSlug = cat.slug || 'kurti'
      }
    }

    let colName = 'Maroon'
    if (colorId) {
      const { data: col } = await supabase.from('colors').select('name').eq('id', colorId).maybeSingle()
      if (col) {
        colName = col.name || 'Maroon'
      }
    }

    const catCode = getCategoryCode(catName, catSlug)
    const colCode = getColourCode(colName)
    const prefix = `SHR-${catCode}-${colCode}-`

    const { data: existingProds } = await supabase
      .from('products')
      .select('sku')
      .ilike('sku', `${prefix}%`)

    let maxSeq = 0
    if (existingProds && existingProds.length > 0) {
      for (const p of existingProds) {
        if (p.sku) {
          const match = p.sku.match(new RegExp(`^${prefix}(\\d+)$`, 'i'))
          if (match) {
            const num = parseInt(match[1], 10)
            if (!isNaN(num) && num > maxSeq) maxSeq = num
          }
        }
      }
    }

    let sequence = maxSeq + 1
    let candidateSku = formatProductSku(catCode, colCode, sequence)

    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: collision } = await supabase
        .from('products')
        .select('id')
        .eq('sku', candidateSku)
        .maybeSingle()

      if (!collision) break
      sequence++
      candidateSku = formatProductSku(catCode, colCode, sequence)
    }

    return { sku: candidateSku }
  } catch (err: any) {
    return { sku: 'SHR-KUR-MRN-001', error: err.message }
  }
}



