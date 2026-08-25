package main

import (
	"database/sql"
	"fmt"
	"time"
)

// Tender represents a tender/RFQ
type Tender struct {
	ID                int64     `json:"id"`
	Title             string    `json:"title"`
	SourcingRequestID *int64    `json:"sourcingRequestId"`
	Deadline          string    `json:"deadline"`
	Status            string    `json:"status"`
	Notes             string    `json:"notes"`
	CreatedBy         int64     `json:"createdBy"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
}

// TenderItem represents an item in a tender
type TenderItem struct {
	ID            int64  `json:"id"`
	TenderID      int64  `json:"tenderId"`
	ProductName   string `json:"productName"`
	Specifications string `json:"specifications"`
	Quantity      int    `json:"quantity"`
	Unit          string `json:"unit"`
}

// TenderSupplier represents a supplier invited to a tender
type TenderSupplier struct {
	ID           int64     `json:"id"`
	TenderID     int64     `json:"tenderId"`
	SupplierID   int64     `json:"supplierId"`
	SupplierName string    `json:"supplierName"`
	Status       string    `json:"status"`
	ResponseDate *string   `json:"responseDate"`
	CreatedAt    time.Time `json:"createdAt"`
}

// TenderStatusTransitions defines valid status transitions
var TenderStatusTransitions = map[string][]string{
	"draft":     {"open", "cancelled"},
	"open":      {"evaluating", "cancelled"},
	"evaluating": {"awarded", "cancelled"},
	"awarded":   {"completed", "cancelled"},
	"completed": {},
	"cancelled": {"draft"},
}

// GetTenders returns all tenders with optional filter
func (a *App) GetTenders(status string, search string) ([]Tender, error) {
	query := `
		SELECT t.id, t.title, t.sourcing_request_id, t.deadline, t.status, t.notes,
			t.created_by, t.created_at, t.updated_at
		FROM tenders t
		WHERE 1=1
	`
	args := []interface{}{}

	if status != "" && status != "all" {
		query += " AND t.status = ?"
		args = append(args, status)
	}

	if search != "" {
		query += " AND (t.title LIKE ? OR t.notes LIKE ?)"
		args = append(args, "%"+search+"%", "%"+search+"%")
	}

	query += " ORDER BY t.created_at DESC"

	rows, err := a.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tenders []Tender
	for rows.Next() {
		var t Tender
		err := rows.Scan(
			&t.ID, &t.Title, &t.SourcingRequestID, &t.Deadline,
			&t.Status, &t.Notes, &t.CreatedBy, &t.CreatedAt, &t.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		tenders = append(tenders, t)
	}

	return tenders, nil
}

// GetTender returns a single tender by ID
func (a *App) GetTender(id int64) (*Tender, error) {
	var t Tender
	err := a.db.QueryRow(`
		SELECT id, title, sourcing_request_id, deadline, status, notes,
			created_by, created_at, updated_at
		FROM tenders
		WHERE id = ?
	`, id).Scan(
		&t.ID, &t.Title, &t.SourcingRequestID, &t.Deadline,
		&t.Status, &t.Notes, &t.CreatedBy, &t.CreatedAt, &t.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("tender not found")
	}
	if err != nil {
		return nil, err
	}

	return &t, nil
}

// CreateTender creates a new tender
func (a *App) CreateTender(tender Tender, items []TenderItem) (int64, error) {
	if _, err := a.checkPermission(PermCreate); err != nil {
		return 0, err
	}
	result, err := a.db.Exec(`
		INSERT INTO tenders (title, sourcing_request_id, deadline, status, notes, created_by)
		VALUES (?, ?, ?, 'draft', ?, ?)
	`,
		tender.Title, tender.SourcingRequestID, tender.Deadline, tender.Notes, tender.CreatedBy,
	)
	if err != nil {
		return 0, err
	}

	tenderID, _ := result.LastInsertId()

	// Insert items
	for _, item := range items {
		_, err := a.db.Exec(`
			INSERT INTO tender_items (tender_id, product_name, specifications, quantity, unit)
			VALUES (?, ?, ?, ?, ?)
		`, tenderID, item.ProductName, item.Specifications, item.Quantity, item.Unit)
		if err != nil {
			return 0, err
		}
	}

	// Log activity
	createdBy := tender.CreatedBy
	a.LogActivity(&createdBy, "created_tender", "tender", &tenderID,
		fmt.Sprintf("Created tender: %s", tender.Title))

	return tenderID, nil
}

// UpdateTenderStatus updates the status of a tender
func (a *App) UpdateTenderStatus(id int64, newStatus string) error {
	if _, err := a.checkPermission(PermApprove); err != nil {
		return err
	}
	var currentStatus string
	err := a.db.QueryRow("SELECT status FROM tenders WHERE id = ?", id).Scan(&currentStatus)
	if err != nil {
		return fmt.Errorf("tender not found")
	}

	// Validate transition
	validTransitions, ok := TenderStatusTransitions[currentStatus]
	if !ok {
		return fmt.Errorf("invalid current status: %s", currentStatus)
	}

	valid := false
	for _, s := range validTransitions {
		if s == newStatus {
			valid = true
			break
		}
	}

	if !valid {
		return fmt.Errorf("cannot transition from %s to %s", currentStatus, newStatus)
	}

	_, err = a.db.Exec(`
		UPDATE tenders
		SET status = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, newStatus, id)
	if err != nil {
		return err
	}

	// Log activity
	a.LogActivity(nil, "updated_tender_status", "tender", &id,
		fmt.Sprintf("Status changed from %s to %s", currentStatus, newStatus))

	return nil
}

// DeleteTender deletes a tender (only if draft)
func (a *App) DeleteTender(id int64) error {
	if _, err := a.checkPermission(PermDelete); err != nil {
		return err
	}
	var status string
	err := a.db.QueryRow("SELECT status FROM tenders WHERE id = ?", id).Scan(&status)
	if err != nil {
		return fmt.Errorf("tender not found")
	}

	if status != "draft" {
		return fmt.Errorf("can only delete tenders in draft status")
	}

	_, err = a.db.Exec("DELETE FROM tender_items WHERE tender_id = ?", id)
	if err != nil {
		return err
	}

	_, err = a.db.Exec("DELETE FROM tender_suppliers WHERE tender_id = ?", id)
	if err != nil {
		return err
	}

	_, err = a.db.Exec("DELETE FROM tenders WHERE id = ?", id)
	return err
}

// GetTenderItems returns items for a tender
func (a *App) GetTenderItems(tenderID int64) ([]TenderItem, error) {
	rows, err := a.db.Query(`
		SELECT id, tender_id, product_name, specifications, quantity, unit
		FROM tender_items
		WHERE tender_id = ?
	`, tenderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []TenderItem
	for rows.Next() {
		var item TenderItem
		err := rows.Scan(&item.ID, &item.TenderID, &item.ProductName, &item.Specifications, &item.Quantity, &item.Unit)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}

	return items, nil
}

// GetTenderSuppliers returns suppliers invited to a tender
func (a *App) GetTenderSuppliers(tenderID int64) ([]TenderSupplier, error) {
	rows, err := a.db.Query(`
		SELECT ts.id, ts.tender_id, ts.supplier_id, s.company_name,
			ts.status, ts.response_date, ts.created_at
		FROM tender_suppliers ts
		JOIN suppliers s ON ts.supplier_id = s.id
		WHERE ts.tender_id = ?
		ORDER BY ts.created_at ASC
	`, tenderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var suppliers []TenderSupplier
	for rows.Next() {
		var ts TenderSupplier
		err := rows.Scan(&ts.ID, &ts.TenderID, &ts.SupplierID, &ts.SupplierName,
			&ts.Status, &ts.ResponseDate, &ts.CreatedAt)
		if err != nil {
			return nil, err
		}
		suppliers = append(suppliers, ts)
	}

	return suppliers, nil
}

// InviteSupplierToTender adds a supplier to a tender
func (a *App) InviteSupplierToTender(tenderID, supplierID int64) (int64, error) {
	if _, err := a.checkPermission(PermCreate); err != nil {
		return 0, err
	}
	// Check if already invited
	var exists bool
	err := a.db.QueryRow(`
		SELECT COUNT(*) > 0 FROM tender_suppliers
		WHERE tender_id = ? AND supplier_id = ?
	`, tenderID, supplierID).Scan(&exists)
	if err != nil {
		return 0, err
	}

	if exists {
		return 0, fmt.Errorf("supplier already invited to this tender")
	}

	result, err := a.db.Exec(`
		INSERT INTO tender_suppliers (tender_id, supplier_id, status)
		VALUES (?, ?, 'invited')
	`, tenderID, supplierID)
	if err != nil {
		return 0, err
	}

	id, _ := result.LastInsertId()
	return id, nil
}

// UpdateTenderSupplierStatus updates the status of a tender supplier
func (a *App) UpdateTenderSupplierStatus(id int64, status string) error {
	if _, err := a.checkPermission(PermUpdate); err != nil {
		return err
	}
	validStatuses := map[string]bool{
		"invited": true, "responded": true, "selected": true, "rejected": true,
	}

	if !validStatuses[status] {
		return fmt.Errorf("invalid status: %s", status)
	}

	query := "UPDATE tender_suppliers SET status = ?"
	if status == "responded" {
		query += ", response_date = CURRENT_TIMESTAMP"
	}
	query += " WHERE id = ?"

	_, err := a.db.Exec(query, status, id)
	return err
}

// RemoveSupplierFromTender removes a supplier from a tender
func (a *App) RemoveSupplierFromTender(id int64) error {
	if _, err := a.checkPermission(PermDelete); err != nil {
		return err
	}
	_, err := a.db.Exec("DELETE FROM tender_suppliers WHERE id = ?", id)
	return err
}
