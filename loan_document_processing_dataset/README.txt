LOAN DOCUMENT PROCESSING AGENT — SYNTHETIC DATASET

Contents
--------
1. loan_approval_dataset.csv
   Original loan approval dataset supplied by the user.

2. document_metadata.csv
   Metadata linking 100 selected loan_ids to 4 synthetic documents each.

3. synthetic_loan_documents/
   400 synthetic PDF documents:
   - Payslip
   - Bank Statement
   - Tax Return
   - KYC

Important
---------
All generated documents are fictional test data. They are clearly marked
as synthetic and are not valid financial, tax, employment, banking, or
identity documents.

Suggested pipeline
------------------
Upload document
 -> Document classifier
 -> OCR/text extraction
 -> Field extraction
 -> Document verification
 -> Applicant/loan matching using loan_id/reference
 -> Risk/eligibility checks
 -> Reviewer queue
