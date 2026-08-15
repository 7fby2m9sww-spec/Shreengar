# Official Source Register: India Post Speed Post Parcel (Domestic)

## 1. Official Service Metadata
- **Official Service Name**: Speed Post Parcel (Domestic)
- **Canonical Service Code**: `speed_post_parcel_domestic`
- **Origin Pincode**: `110092`
- **Origin Office / Jurisdiction**: `UNRESOLVED` (Requires official India Post evidence)
- **Origin Coordinates**: `UNRESOLVED` (No coordinate workflow enabled)
- **Local-Zone Rule**: `UNRESOLVED` (Pending official India Post evidence relative to origin 110092)
- **Tariff Currency**: Indian Rupee (INR / Paise)
- **Tax Rate Status**: `UNRESOLVED` — Applicable tax rate and effective date remain UNRESOLVED until verified from an official government or India Post notification.
- **Payment Method**: Prepaid Only (No Cash on Delivery).

---

## 2. Published Destination Distance Bands (Distance Zones)
1. **Local**: `local` (Delivery within local jurisdiction relative to origin 110092 — exact jurisdiction boundary UNRESOLVED)
2. **Up to 200 km**: `up_to_200_km`
3. **201 to 1000 km**: `201_to_1000_km`
4. **1001 to 2000 km**: `1001_to_2000_km`
5. **Above 2000 km**: `above_2000_km`

---

## 3. Published Weight Slabs
- **Base Slab 1**: Up to 50 grams
- **Base Slab 2**: 51 grams to 200 grams
- **Base Slab 3**: 201 grams to 500 grams
- **Additional Weight Increment**: Additional 500 grams or part thereof

---

## 4. Source Registration Provenance Schema
Every verified tariff import batch must log exact evidence metadata:
- **Exact Tariff Page URL**: Specific URL or document path (Generic homepage URLs like `https://www.indiapost.gov.in` DO NOT count as evidence; if exact URL is unavailable, field must remain BLANK)
- **Source Access Date**: ISO 8601 Date (`YYYY-MM-DD`)
- **Source Document Title**: Official Published Tariff Title
- **Source Authority**: Department of Posts, Ministry of Communications, Government of India
- **Verification Status**: `unverified` | `verified` | `rejected`
- **Verified By Admin ID**: Authenticated Admin UUID
- **Verified By Email**: Immutable Admin Email Snapshot
- **Verified At**: Timestamp of verification
- **Verification Notes**: Notes documenting verification scope and evidence

---

## 5. Exclusions & Mandatory Disclaimers
- **Tax Rate Disclaimer**: Applicable tax rate and effective date remain UNRESOLVED until verified from an official government or India Post notification.
- **Proof of Delivery (POD)**: Optional ancillary fee; MUST NOT be included as default base shipping charge.
- **Discounts**: Bulk customer or contractual volume discounts MUST NOT be included in public storefront tariff calculations.
- **Cash on Delivery (COD)**: Strictly excluded and disabled across all shipping quotes.
- **Packaging & Handling Fees**: Excluded from India Post carrier tariff rates. Packaging charges (if any) are handled separately.
