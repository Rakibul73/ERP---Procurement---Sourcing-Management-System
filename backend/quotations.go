package main

import (
	"fmt"
	"time"
)

// Quotation represents a supplier quotation
type Quotation struct {
	ID               int64     `json:"id"`
	TenderID         *int64    `json:"tenderId"`
	SupplierID       int64     `json:"supplierId"`
	SupplierName     string    `json:"supplierName"`
	SourcingRequestID *int64   `json:"sourcingRequestId"`
	Title            string    `json:"title"`
	Status           string    `json:"status"`
	Currency         string    `json:"currency"`
	ValidityDate     *string   `json:"validityDate"`
	ShippingTerms    string    `json:"shippingTerms"`
	PaymentTerms     string    `json:"paymentTerms"`
	LeadTimeDays     *int      `json:"leadTimeDays"`
	Notes            string    `json:"notes"`
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

// QuotationLineItem represents a line item in a quotation
type QuotationLineItem struct {
	ID              int64   `json:"id"`
	QuotationID     int64   `json:"quotationId"`
	ProductName     string  `json:"productName"`
	Specifications  string  `json:"specifications"`
	Quantity        int     `json:"quantity"`
	UnitPrice       float64 `json:"unitPrice"`
	MOQ             *int    `json:"moq"`
	LeadTimeDays    *int    `json:"leadTimeDays"`
	Notes           string  `json:"notes"`
	CreatedAt       time.Time `json:"createdAt"`
}

// QuotationStatusTransitions defines valid status transitions
var QuotationStatusTransitions = map[string][]string{
	"draft":    {"received"},
	"received": {"reviewed"},
	"reviewed": {"accepted", "rejected"},
	"accepted": {},
	"rejected": {},
}

// GetQuotations returns quotations filtered by status and search
func (a *App) GetQuotations(status string, search string) ([]Quotation, error) {
	query := `
		SELECT q.id, q.tender_id, q.supplier_id, s.company_name, q.sourcing_request_id,
			q.title, q.status, q.currency, q.validity_date, q.shipping_terms,
			q.payment_terms, q.lead_time_days, q.notes, q.created_at, q.updated_at
		FROM quotations q
		JOIN suppliers s ON q.supplier_id = s.id
		WHERE 1=1
	`
	args := []interface{}{}

	if status != "all" && status != "" {
		query += " AND q.status = ?"
		args = append(args, status)
	}

	if search != "" {
		query += " AND (q.title LIKE ? OR s.company_name LIKE ?)"
		s := "%" + search + "%"
		args = append(args, s, s)
	}

	query += " ORDER BY q.created_at DESC"

	rows, err := a.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var quotations []Quotation
	for rows.Next() {
		var q Quotation
		err := rows.Scan(
			&q.ID, &q.TenderID, &q.SupplierID, &q.SupplierName, &q.SourcingRequestID,
			&q.Title, &q.Status, &q.Currency, &q.ValidityDate, &q.ShippingTerms,
			&q.PaymentTerms, &q.LeadTimeDays, &q.Notes, &q.CreatedAt, &q.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		quotations = append(quotations, q)
	}

	return quotations, nil
}

// GetQuotation returns a single quotation
func (a *App) GetQuotation(id int64) (Quotation, error) {
	var q Quotation
	err := a.db.QueryRow(`
		SELECT q.id, q.tender_id, q.supplier_id, s.company_name, q.sourcing_request_id,
			q.title, q.status, q.currency, q.validity_date, q.shipping_terms,
			q.payment_terms, q.lead_time_days, q.notes, q.created_at, q.updated_at
		FROM quotations q
		JOIN suppliers s ON q.supplier_id = s.id
		WHERE q.id = ?
	`, id).Scan(
		&q.ID, &q.TenderID, &q.SupplierID, &q.SupplierName, &q.SourcingRequestID,
		&q.Title, &q.Status, &q.Currency, &q.ValidityDate, &q.ShippingTerms,
		&q.PaymentTerms, &q.LeadTimeDays, &q.Notes, &q.CreatedAt, &q.UpdatedAt,
	)
	if err != nil {
		return Quotation{}, err
	}
	return q, nil
}

// CreateQuotation creates a new quotation with line items
func (a *App) CreateQuotation(quotation Quotation, items []QuotationLineItem) (int64, error) {
	if _, err := a.checkPermission(PermCreate); err != nil {
		return 0, err
	}
	if _, ok := QuotationStatusTransitions[quotation.Status]; !ok && quotation.Status != "" {
		return 0, fmt.Errorf("invalid status: %s", quotation.Status)
	}
	if quotation.Status == "" {
		quotation.Status = "draft"
	}

	result, err := a.db.Exec(`
		INSERT INTO quotations (tender_id, supplier_id, sourcing_request_id, title, status,
			currency, validity_date, shipping_terms, payment_terms, lead_time_days, notes)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, quotation.TenderID, quotation.SupplierID, quotation.SourcingRequestID,
		quotation.Title, quotation.Status, quotation.Currency,
		quotation.ValidityDate, quotation.ShippingTerms, quotation.PaymentTerms,
		quotation.LeadTimeDays, quotation.Notes)
	if err != nil {
		return 0, err
	}

	qID, err := result.LastInsertId()
	if err != nil {
		return 0, err
	}

	for _, item := range items {
		_, err := a.db.Exec(`
			INSERT INTO quotation_line_items (quotation_id, product_name, specifications, quantity, unit_price, moq, lead_time_days, notes)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		`, qID, item.ProductName, item.Specifications, item.Quantity, item.UnitPrice, item.MOQ, item.LeadTimeDays, item.Notes)
		if err != nil {
			return 0, err
		}
	}

	a.LogActivity(nil, "create", "quotation", &qID, fmt.Sprintf("Created quotation from supplier #%d", quotation.SupplierID))
	return qID, nil
}

// UpdateQuotationStatus updates a quotation's status
func (a *App) UpdateQuotationStatus(id int64, newStatus string) error {
	if _, err := a.checkPermission(PermUpdate); err != nil {
		return err
	}
	allowed := QuotationStatusTransitions[newStatus]
	_ = allowed

	var currentStatus string
	err := a.db.QueryRow("SELECT status FROM quotations WHERE id = ?", id).Scan(&currentStatus)
	if err != nil {
		return err
	}

	valid := false
	for _, s := range QuotationStatusTransitions[currentStatus] {
		if s == newStatus {
			valid = true
			break
		}
	}
	if !valid {
		return fmt.Errorf("cannot transition from %s to %s", currentStatus, newStatus)
	}

	_, err = a.db.Exec("UPDATE quotations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", newStatus, id)
	if err != nil {
		return err
	}

	a.LogActivity(nil, "update", "quotation", &id, fmt.Sprintf("Status changed from %s to %s", currentStatus, newStatus))
	return nil
}

// DeleteQuotation deletes a quotation and its line items
func (a *App) DeleteQuotation(id int64) error {
	if _, err := a.checkPermission(PermDelete); err != nil {
		return err
	}
	_, err := a.db.Exec("DELETE FROM quotation_line_items WHERE quotation_id = ?", id)
	if err != nil {
		return err
	}

	_, err = a.db.Exec("DELETE FROM quotations WHERE id = ?", id)
	if err != nil {
		return err
	}

	a.LogActivity(nil, "delete", "quotation", &id, "Deleted quotation")
	return nil
}

// GetQuotationLineItems returns line items for a quotation
func (a *App) GetQuotationLineItems(quotationID int64) ([]QuotationLineItem, error) {
	rows, err := a.db.Query(`
		SELECT id, quotation_id, product_name, specifications, quantity, unit_price, moq, lead_time_days, notes, created_at
		FROM quotation_line_items
		WHERE quotation_id = ?
		ORDER BY id
	`, quotationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []QuotationLineItem
	for rows.Next() {
		var item QuotationLineItem
		err := rows.Scan(
			&item.ID, &item.QuotationID, &item.ProductName, &item.Specifications,
			&item.Quantity, &item.UnitPrice, &item.MOQ, &item.LeadTimeDays, &item.Notes, &item.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}

	return items, nil
}

// QuotationComparisonRow represents one supplier row in the comparison matrix
type QuotationComparisonRow struct {
	SupplierName string  `json:"supplierName"`
	ProductName  string  `json:"productName"`
	UnitPrice    float64 `json:"unitPrice"`
	Quantity     int     `json:"quantity"`
	TotalPrice   float64 `json:"totalPrice"`
	MOQ          *int    `json:"moq"`
	LeadTimeDays *int    `json:"leadTimeDays"`
	PaymentTerms string  `json:"paymentTerms"`
	ShippingTerms string `json:"shippingTerms"`
	Currency     string  `json:"currency"`
	QuotationID  int64   `json:"quotationId"`
	Status       string  `json:"status"`
}

// GetQuotationComparison returns a comparison matrix for all quotations under a tender
func (a *App) GetQuotationComparison(tenderID int64) ([]QuotationComparisonRow, error) {
	rows, err := a.db.Query(`
		SELECT s.company_name,qli.product_name, qli.unit_price, qli.quantity,
			(qli.unit_price * qli.quantity) as total_price,
			qli.moq, qli.lead_time_days, q.payment_terms, q.shipping_terms,
			q.currency, q.id as quotation_id, q.status
		FROM quotations q
		JOIN suppliers s ON q.supplier_id = s.id
		JOIN quotation_line_items qli ON q.id = qli.quotation_id
		WHERE q.tender_id = ?
		ORDER BY s.company_name, qli.product_name
	`, tenderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []QuotationComparisonRow
	for rows.Next() {
		var row QuotationComparisonRow
		err := rows.Scan(
			&row.SupplierName, &row.ProductName, &row.UnitPrice, &row.Quantity,
			&row.TotalPrice, &row.MOQ, &row.LeadTimeDays, &row.PaymentTerms,
			&row.ShippingTerms, &row.Currency, &row.QuotationID, &row.Status,
		)
		if err != nil {
			return nil, err
		}
		result = append(result, row)
	}

	return result, nil
}
