# Shipping Source Evidence Workflow

This document describes the administrative and server-only workflow designed and built in Step 3C for registering, reviewing, verifying, rejecting, and linking official source evidence for India Post shipping tariff sheets and pincode import batches.

---

## 1. Purpose

To prevent shipping errors, incorrect rates, and unverified data from entering production, all shipping parameters (tariff schedules, tax rates, and pincode directories) must be linked to verified official publications. The source-evidence workflow ensures administrative accountability by requiring dual-stage verification (registration followed by checklist-driven verification) before any document can be linked as evidence.

---

## 2. Supported Evidence Types

Source documents are classified into four categories:
1. `tariff_schedule`: Official postal rate sheets published by the Department of Posts.
2. `tax_notification`: Official notifications or Gazette publications detailing Goods and Services Tax (GST) rates.
3. `pincode_directory`: Official directories listing Pin codes.
4. `jurisdiction_definition`: Official notifications determining the jurisdiction zones (local, sub-office, etc.) relative to the Shreengar origin sub-office (Pin code **110092**).

---

## 3. Creation & Registration Workflow

Admins register a document using the **Source Evidence** page in the Admin Dashboard:
- **Default Status**: Newly registered documents always start with `verification_status = 'unverified'`.
- **Fields collected**: Title, Issuing Authority, Publication Date, Access Date (optional), and Locators.
- **Verification fields hidden**: Verifier identities (`verified_by_auth_user_id`, `verified_by_email`), timestamps, and verification notes cannot be inputted or modified during creation.

---

## 4. Exact-Source URL & Locator Policy

To guarantee the reliability of source links, the following policies are enforced:
- **No Generic Homepages**: URLs matching main landing pages (such as `https://indiapost.gov.in`, `https://www.indiapost.gov.in`, or their sub-paths like `index.html`) are strictly rejected. Page paths or deep document URLs must be used.
- **Mandatory Locators**: A document must contain at least one of the three durable locators:
  - `exact_source_url` (must point to a deep file/page)
  - `stored_file_reference` (relative path to storage bucket)
  - `official_document_number` (Gazette or circular number)
- **Hash Checks**: If `stored_file_reference` is supplied, a valid SHA-256 hash must be generated and stored under `file_hash` to ensure file integrity.

---

## 5. Review, Verification, and Rejection Rules

Verification is a separate administrative action that requires checking off a mandatory checklist:
- **Checker Checklist**:
  - Registered Title matches the official publication.
  - Authority is correct.
  - Durable locator opens the correct official page/file (no generic homepages).
  - Publication date matches the source.
  - No tariff rates, zones, or tax percentages were automatically inferred.
- **Specific Verification Rules**:
  - `tax_notification` requires explicit verification notes.
  - `jurisdiction_definition` requires the verifier to explicitly mention origin pincode **110092** in the verification notes.
- **Action State**:
  - **Verify**: Persists `verification_status = 'verified'`, verifier auth UUID, email, and timestamp.
  - **Reject**: Persists `verification_status = 'rejected'`, reviewer UUID, email, timestamp, and rejection notes (notes must be nonblank).

---

## 6. Document Immutability

Once a document is marked `verified` or `rejected`, it is immutable in the application:
- Edit controls are disabled.
- Normal updates are rejected by the backend service.
- The document cannot be deleted.

---

## 7. Tariff & Pincode Evidence Linking

- **Draft Tariffs only**: Only draft tariff versions can link/unlink evidence.
- **Role Compatibility**:
  - `tariff_schedule` role accepts only `tariff_schedule` documents.
  - `tax_notification` role accepts only `tax_notification` documents.
  - Trigger `trg_check_tariff_evidence_role_compatibility` blocks mismatched roles with `SHIPPING_EVIDENCE_ROLE_MISMATCH`.
- **Primary Schedule**: Exactly one verified primary `tariff_schedule` link is allowed.
- **Pincode Batches**:
  - Links verified `pincode_directory` and `jurisdiction_definition` documents to a pincode import batch.
  - Mismatches are blocked by the database trigger `trg_check_pincode_batch_evidence_role_compatibility`.

---

## 8. File Evidence & Storage Policy

- **Bucket**: A private bucket named `shipping-evidence` is proposed (not created remotely).
- **Security**: Uploads must be restricted to authenticated Admin users only. Signed URLs with short expiration times must be generated on-demand for Admin review.

---

## 9. Admin Identity and Activity Logging

- **Identity**: Resolved only through trusted server-side authentication (`requireAdmin()`).
- **Activity Log Actions**:
  - `shipping.evidence_created`
  - `shipping.evidence_updated`
  - `shipping.evidence_verified`
  - `shipping.evidence_rejected`
  - `shipping.tariff_evidence_linked`
  - `shipping.tariff_evidence_unlinked`
  - `shipping.pincode_evidence_linked`
  - `shipping.pincode_evidence_unlinked`
- **Best-Effort Notice**: Because these activity log writes are initiated from application code rather than database-level transactional triggers/RPCs, they are currently best-effort and would not automatically roll back if a subsequent database operation fails outside a transaction.

---

## 10. Operational Status Summary

> [!IMPORTANT]
> The workflow is purely local and prepared in code:
> - **No official evidence has been inserted.**
> - **No tax has been resolved.**
> - **No tariff rates have been imported.**
> - **No pincodes have been imported.**
> - **No tariff has been verified.**
> - **Shipping remains disabled.**

---

## 11. Manual Next Steps

1. Apply the Step 3B migration in the Supabase SQL Editor.
2. Register the official evidence documents through the Admin Source Evidence form.
3. Verify the source documents after completing the checklist.
4. Link the verified documents to the draft tariff sheets and import batches.
