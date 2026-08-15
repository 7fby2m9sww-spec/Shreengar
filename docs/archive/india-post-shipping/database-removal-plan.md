# Database Removal Plan: India Post Shipping Feature

> [!WARNING]
> **This plan has not been applied.** Database removal requires a separate backup, dependency audit, and explicit approval. Do not execute these steps directly on any live database without thorough manual staging validation.

This document details the dormant database objects associated with the India Post shipping management feature. These tables, columns, functions, triggers, and RLS rules can be removed in a future destructive migration.

---

## 1. Dormant Database Objects to Remove

The following database objects are currently dormant and preserved for compatibility:

### Tables
1. `public.india_post_tariff_versions`
2. `public.india_post_tariff_rates`
3. `public.india_post_pincodes`
4. `public.shipping_settings`
5. `public.shipping_quotes`
6. `public.shipping_source_documents`
7. `public.india_post_tariff_version_evidence`
8. `public.shipping_pincode_import_batches`
9. `public.shipping_pincode_batch_evidence`
10. `public.india_post_pincode_import_entries`

### Table Columns (to drop from `public.orders`)
1. `shipping_origin_pincode` (VARCHAR)
2. `shipping_destination_pincode` (VARCHAR)
3. `shipping_tariff_version_id` (UUID)
4. `shipping_chargeable_weight_grams` (INTEGER)
5. `shipping_cost_paise` (INTEGER)
6. `customer_shipping_charge_paise` (INTEGER)
7. `shipping_tax_paise` (INTEGER)
8. `estimated_delivery_min` (INTEGER)
9. `estimated_delivery_max` (INTEGER)
10. `shipping_quote_snapshot` (JSONB)
11. `shipping_quote_id` (UUID)
12. `shipping_zone` (VARCHAR)
13. `shipping_tariff_paise` (INTEGER)
14. `shipping_snapshot` (JSONB)
15. `shipping_fee` (NUMERIC)

### Table Columns (to drop from `public.product_variants`)
1. `last_import_batch_id` (UUID)

### Functions and RPCs
1. `public.is_admin_user()`
2. `public.import_india_post_tariff_rates_transactional(...)`
3. `public.import_india_post_pincodes_transactional(...)`
4. `public.verify_india_post_tariff_version_transactional(...)`
5. `public.prevent_pincode_import_entries_mutation()`

### Triggers
1. `trg_prevent_pincode_import_entries_mutation` on `public.india_post_pincode_import_entries`
2. `trg_check_tariff_evidence_role_compatibility` on `public.india_post_tariff_version_evidence`
3. `trg_check_pincode_batch_evidence_role_compatibility` on `public.shipping_pincode_batch_evidence`

### Indexes
1. `idx_tariff_rates_version_zone` on `public.india_post_tariff_rates(tariff_version_id, destination_zone_code)`
2. `idx_pincodes_state_district` on `public.india_post_pincodes(state, district)`
3. `idx_pincode_batches_status` on `public.shipping_pincode_import_batches(verification_status)`
4. `idx_pincode_batches_imported_at` on `public.shipping_pincode_import_batches(imported_at)`

---

## 2. Recommended Rollback Execution Order

Because of foreign key references, the objects must be dropped in the following dependency-safe order:

1. **Drop Triggers**:
   - `DROP TRIGGER IF EXISTS trg_prevent_pincode_import_entries_mutation ON public.india_post_pincode_import_entries;`
   - `DROP TRIGGER IF EXISTS trg_check_tariff_evidence_role_compatibility ON public.india_post_tariff_version_evidence;`
   - `DROP TRIGGER IF EXISTS trg_check_pincode_batch_evidence_role_compatibility ON public.shipping_pincode_batch_evidence;`
2. **Drop Columns from `public.orders` & `public.product_variants`**:
   - Remove columns listed in Section 1.
3. **Drop Evidence & Batch Link Tables**:
   - `DROP TABLE IF EXISTS public.india_post_tariff_version_evidence;`
   - `DROP TABLE IF EXISTS public.shipping_pincode_batch_evidence;`
   - `DROP TABLE IF EXISTS public.india_post_pincode_import_entries;`
4. **Drop Source Documents & Import Batches Tables**:
   - `DROP TABLE IF EXISTS public.shipping_source_documents;`
   - `DROP TABLE IF EXISTS public.shipping_pincode_import_batches;`
5. **Drop Core Rates & Pincodes Tables**:
   - `DROP TABLE IF EXISTS public.india_post_tariff_rates;`
   - `DROP TABLE IF EXISTS public.india_post_tariff_versions;`
   - `DROP TABLE IF EXISTS public.india_post_pincodes;`
   - `DROP TABLE IF EXISTS public.shipping_quotes;`
   - `DROP TABLE IF EXISTS public.shipping_settings;`
6. **Drop RPCs and Helper Functions**:
   - `DROP FUNCTION IF EXISTS public.verify_india_post_tariff_version_transactional;`
   - `DROP FUNCTION IF EXISTS public.import_india_post_tariff_rates_transactional;`
   - `DROP FUNCTION IF EXISTS public.import_india_post_pincodes_transactional;`
   - `DROP FUNCTION IF EXISTS public.prevent_pincode_import_entries_mutation;`
7. **Revoke Grants and Clean up Roles**:
   - Clean up table-specific permissions.
