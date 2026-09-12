from app.services import extraction_service as es


def test_extract_payslip():
    fields = es._extract_fields(
        "PAYSLIP",
        "Employee Name: John Doe\nPeriod: March 2026\nNet Pay: \u20b950,000\nGross Salary: \u20b965,000",
    )
    assert fields["net_income"] == 50000.0
    assert fields["employee_name"] == "John Doe"
    assert fields["payslip_period"] == "March 2026"


def test_extract_bank_statement():
    fields = es._extract_fields(
        "BANK_STATEMENT",
        "Account Holder: Jane Roe\nClosing Balance: \u20b91,24,500.50",
    )
    assert fields["closing_balance"] == 124500.50
    assert fields["account_holder"] == "Jane Roe"


def test_extract_tax_return():
    fields = es._extract_fields("TAX_RETURN", "Name: Jane Roe\nTotal Income: \u20b97,80,000")
    assert fields["gross_income"] == 780000.0
    assert fields["taxpayer_name"] == "Jane Roe"


def test_extract_returns_nothing_on_empty_content():
    assert es._extract_fields("PAYSLIP", "") == {}


def test_missing_documents():
    documents = [{"document_type": "PAYSLIP", "status": "VALID"}]
    assert es._missing_documents(documents) == ["BANK_STATEMENT", "KYC", "TAX_RETURN"]


def test_classifies_document_from_filename():
    assert es.classify_document_type("march-payslip.pdf", b"", "OTHER") == "PAYSLIP"
    assert es.classify_document_type("identity-proof.jpg", b"", "OTHER") == "KYC"


def test_risk_level_reflects_validation_issues():
    assert es._risk_level([], [], 0) == "LOW"
    assert es._risk_level(["KYC"], [], 0) == "MEDIUM"
    assert es._risk_level(["KYC", "TAX_RETURN"], ["income mismatch"], 0) == "HIGH"


def test_inconsistency_income_difference():
    documents = [
        {"id": "1", "document_type": "PAYSLIP", "status": "VALID"},
        {"id": "2", "document_type": "TAX_RETURN", "status": "VALID"},
    ]
    extracted = {
        "1": {"net_income": 50000.0},
        "2": {"gross_income": 90000.0},
    }
    results = es._compute_inconsistencies(documents, extracted)
    assert len(results) == 1
    assert "differs" in results[0]


def test_no_inconsistency_when_income_matches():
    documents = [
        {"id": "1", "document_type": "PAYSLIP", "status": "VALID"},
        {"id": "2", "document_type": "TAX_RETURN", "status": "VALID"},
    ]
    extracted = {"1": {"net_income": 50000.0}, "2": {"gross_income": 48000.0}}
    assert es._compute_inconsistencies(documents, extracted) == []