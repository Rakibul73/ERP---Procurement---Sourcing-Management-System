package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"
)

// SourcingRequest represents a sourcing request
type SourcingRequest struct {
	ID           int64     `json:"id"`
	Title        string    `json:"title"`
	Description  string    `json:"description"`
	Status       string    `json:"status"`
	Priority     string    `json:"priority"`
	TargetDate   string    `json:"targetDate"`
	Budget       float64   `json:"budget"`
	Currency     string    `json:"currency"`
	CreatedBy    int64     `json:"createdBy"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

// SourcingRequestProduct represents a product in a sourcing request
type SourcingRequestProduct struct {
	ID              int64   `json:"id"`
	SourcingReqID   int64   `json:"sourcingRequestId"`
	ProductID       int64   `json:"productId"`
	ProductName     string  `json:"productName"`
	Quantity        float64 `json:"quantity"`
	Unit            string  `json:"unit"`
	Specifications  string  `json:"specifications"`
	EstimatedBudget float64 `json:"estimatedBudget"`
}

// SupplierShortlist represents a shortlisted supplier for a sourcing request
type SupplierShortlist struct {
	ID            int64     `json:"id"`
	SourcingReqID int64     `json:"sourcingRequestId"`
	SupplierID    int64     `json:"supplierId"`
	SupplierName  string    `json:"supplierName"`
	Status        string    `json:"status"` // pending, invited, responded, shortlisted, rejected
	Notes         string    `json:"notes"`
	Ranking       int       `json:"ranking"`
	CreatedAt     time.Time `json:"createdAt"`
}

// SourcingStatusTransitions defines valid status transitions
var SourcingStatusTransitions = map[string][]string{
	"draft":      {"pending", "cancelled"},
	"pending":    {"approved", "cancelled"},
	"approved":   {"sourcing", "cancelled"},
	"sourcing":   {"shortlisted", "cancelled"},
	"shortlisted": {"awarded", "cancelled"},
	"awarded":    {"completed", "cancelled"},
	"completed":  {},
	"cancelled":  {"draft"},
}

// GetSourcingRequests returns all sourcing requests with optional filter
func (a *App) GetSourcingRequests(status string, search string) ([]SourcingRequest, error) {
	query := `
		SELECT id, title, description, status, priority, target_date, budget, currency,
			created_by, created_at, updated_at
		FROM sourcing_requests
		WHERE 1=1
	`
	args := []interface{}{}

	if status != "" && status != "all" {
		query += " AND status = ?"
		args = append(args, status)
	}

	if search != "" {
		query += " AND (title LIKE ? OR description LIKE ?)"
		args = append(args, "%"+search+"%", "%"+search+"%")
	}

	query += " ORDER BY created_at DESC"

	rows, err := a.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var requests []SourcingRequest
	for rows.Next() {
		var req SourcingRequest
		err := rows.Scan(
			&req.ID, &req.Title, &req.Description, &req.Status,
			&req.Priority, &req.TargetDate, &req.Budget, &req.Currency,
			&req.CreatedBy, &req.CreatedAt, &req.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		requests = append(requests, req)
	}

	return requests, nil
}

// GetSourcingRequest returns a single sourcing request by ID
func (a *App) GetSourcingRequest(id int64) (*SourcingRequest, error) {
	var req SourcingRequest
	err := a.db.QueryRow(`
		SELECT id, title, description, status, priority, target_date, budget, currency,
			created_by, created_at, updated_at
		FROM sourcing_requests
		WHERE id = ?
	`, id).Scan(
		&req.ID, &req.Title, &req.Description, &req.Status,
		&req.Priority, &req.TargetDate, &req.Budget, &req.Currency,
		&req.CreatedBy, &req.CreatedAt, &req.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("sourcing request not found")
	}
	if err != nil {
		return nil, err
	}

	return &req, nil
}

// CreateSourcingRequest creates a new sourcing request
func (a *App) CreateSourcingRequest(req SourcingRequest, products []SourcingRequestProduct) (int64, error) {
	if _, err := a.checkPermission(PermCreate); err != nil {
		return 0, err
	}
	result, err := a.db.Exec(`
		INSERT INTO sourcing_requests (title, description, status, priority, target_date, budget, currency, created_by)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`,
		req.Title, req.Description, "draft", req.Priority, req.TargetDate, req.Budget, req.Currency, req.CreatedBy,
	)
	if err != nil {
		return 0, err
	}

	sourcingReqID, _ := result.LastInsertId()

	// Insert products
	for _, p := range products {
		_, err := a.db.Exec(`
			INSERT INTO sourcing_request_products (sourcing_req_id, product_id, quantity, unit, specifications, estimated_budget)
			VALUES (?, ?, ?, ?, ?, ?)
		`, sourcingReqID, p.ProductID, p.Quantity, p.Unit, p.Specifications, p.EstimatedBudget)
		if err != nil {
			return 0, err
		}
	}

	// Log activity
	createdBy := req.CreatedBy
	a.LogActivity(&createdBy, "created_sourcing_request", "sourcing_request", &sourcingReqID,
		fmt.Sprintf("Created sourcing request: %s", req.Title))

	return sourcingReqID, nil
}

// UpdateSourcingRequest updates an existing sourcing request
func (a *App) UpdateSourcingRequest(id int64, req SourcingRequest, products []SourcingRequestProduct) error {
	if _, err := a.checkPermission(PermUpdate); err != nil {
		return err
	}
	// Check current status
	var currentStatus string
	err := a.db.QueryRow("SELECT status FROM sourcing_requests WHERE id = ?", id).Scan(&currentStatus)
	if err != nil {
		return fmt.Errorf("sourcing request not found")
	}

	if currentStatus != "draft" && currentStatus != "pending" {
		return fmt.Errorf("cannot edit sourcing request in %s status", currentStatus)
	}

	_, err = a.db.Exec(`
		UPDATE sourcing_requests
		SET title = ?, description = ?, priority = ?, target_date = ?, budget = ?, currency = ?,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`,
		req.Title, req.Description, req.Priority, req.TargetDate, req.Budget, req.Currency, id,
	)
	if err != nil {
		return err
	}

	// Delete existing products and re-insert
	_, err = a.db.Exec("DELETE FROM sourcing_request_products WHERE sourcing_req_id = ?", id)
	if err != nil {
		return err
	}

	for _, p := range products {
		_, err := a.db.Exec(`
			INSERT INTO sourcing_request_products (sourcing_req_id, product_id, quantity, unit, specifications, estimated_budget)
			VALUES (?, ?, ?, ?, ?, ?)
		`, id, p.ProductID, p.Quantity, p.Unit, p.Specifications, p.EstimatedBudget)
		if err != nil {
			return err
		}
	}

	return nil
}

// UpdateSourcingRequestStatus updates the status of a sourcing request
func (a *App) UpdateSourcingRequestStatus(id int64, newStatus string) error {
	if _, err := a.checkPermission(PermApprove); err != nil {
		return err
	}
	var currentStatus string
	err := a.db.QueryRow("SELECT status FROM sourcing_requests WHERE id = ?", id).Scan(&currentStatus)
	if err != nil {
		return fmt.Errorf("sourcing request not found")
	}

	// Validate transition
	validTransitions, ok := SourcingStatusTransitions[currentStatus]
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
		UPDATE sourcing_requests
		SET status = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, newStatus, id)
	if err != nil {
		return err
	}

	// Log activity
	a.LogActivity(nil, "updated_sourcing_status", "sourcing_request", &id,
		fmt.Sprintf("Status changed from %s to %s", currentStatus, newStatus))

	return nil
}

// DeleteSourcingRequest deletes a sourcing request (only if draft)
func (a *App) DeleteSourcingRequest(id int64) error {
	if _, err := a.checkPermission(PermDelete); err != nil {
		return err
	}
	var status string
	err := a.db.QueryRow("SELECT status FROM sourcing_requests WHERE id = ?", id).Scan(&status)
	if err != nil {
		return fmt.Errorf("sourcing request not found")
	}

	if status != "draft" {
		return fmt.Errorf("can only delete sourcing requests in draft status")
	}

	_, err = a.db.Exec("DELETE FROM sourcing_request_products WHERE sourcing_req_id = ?", id)
	if err != nil {
		return err
	}

	_, err = a.db.Exec("DELETE FROM supplier_shortlists WHERE sourcing_req_id = ?", id)
	if err != nil {
		return err
	}

	_, err = a.db.Exec("DELETE FROM sourcing_requests WHERE id = ?", id)
	return err
}

// GetSourcingRequestProducts returns products for a sourcing request
func (a *App) GetSourcingRequestProducts(sourcingReqID int64) ([]SourcingRequestProduct, error) {
	rows, err := a.db.Query(`
		SELECT srp.id, srp.sourcing_req_id, srp.product_id, p.name,
			srp.quantity, srp.unit, srp.specifications, srp.estimated_budget
		FROM sourcing_request_products srp
		JOIN products p ON srp.product_id = p.id
		WHERE srp.sourcing_req_id = ?
	`, sourcingReqID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var products []SourcingRequestProduct
	for rows.Next() {
		var p SourcingRequestProduct
		err := rows.Scan(
			&p.ID, &p.SourcingReqID, &p.ProductID, &p.ProductName,
			&p.Quantity, &p.Unit, &p.Specifications, &p.EstimatedBudget,
		)
		if err != nil {
			return nil, err
		}
		products = append(products, p)
	}

	return products, nil
}

// GetShortlistedSuppliers returns suppliers shortlisted for a sourcing request
func (a *App) GetShortlistedSuppliers(sourcingReqID int64) ([]SupplierShortlist, error) {
	rows, err := a.db.Query(`
		SELECT ss.id, ss.sourcing_req_id, ss.supplier_id, s.company_name,
			ss.status, ss.notes, ss.ranking, ss.created_at
		FROM supplier_shortlists ss
		JOIN suppliers s ON ss.supplier_id = s.id
		WHERE ss.sourcing_req_id = ?
		ORDER BY ss.ranking ASC
	`, sourcingReqID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var shortlists []SupplierShortlist
	for rows.Next() {
		var sl SupplierShortlist
		err := rows.Scan(
			&sl.ID, &sl.SourcingReqID, &sl.SupplierID, &sl.SupplierName,
			&sl.Status, &sl.Notes, &sl.Ranking, &sl.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		shortlists = append(shortlists, sl)
	}

	return shortlists, nil
}

// AddSupplierToShortlist adds a supplier to the shortlist for a sourcing request
func (a *App) AddSupplierToShortlist(sourcingReqID, supplierID int64, notes string) (int64, error) {
	if _, err := a.checkPermission(PermCreate); err != nil {
		return 0, err
	}
	// Check if already shortlisted
	var exists bool
	err := a.db.QueryRow(`
		SELECT COUNT(*) > 0 FROM supplier_shortlists
		WHERE sourcing_req_id = ? AND supplier_id = ?
	`, sourcingReqID, supplierID).Scan(&exists)
	if err != nil {
		return 0, err
	}

	if exists {
		return 0, fmt.Errorf("supplier already shortlisted for this request")
	}

	// Get next ranking
	var maxRanking int
	a.db.QueryRow(`
		SELECT COALESCE(MAX(ranking), 0) FROM supplier_shortlists
		WHERE sourcing_req_id = ?
	`, sourcingReqID).Scan(&maxRanking)

	result, err := a.db.Exec(`
		INSERT INTO supplier_shortlists (sourcing_req_id, supplier_id, status, notes, ranking)
		VALUES (?, ?, 'pending', ?, ?)
	`, sourcingReqID, supplierID, notes, maxRanking+1)
	if err != nil {
		return 0, err
	}

	id, _ := result.LastInsertId()

	a.LogActivity(nil, "added_supplier_shortlist", "supplier_shortlist", &id,
		fmt.Sprintf("Added supplier %d to shortlist for sourcing request %d", supplierID, sourcingReqID))

	return id, nil
}

// UpdateSupplierShortlistStatus updates the status of a shortlisted supplier
func (a *App) UpdateSupplierShortlistStatus(id int64, status string) error {
	if _, err := a.checkPermission(PermUpdate); err != nil {
		return err
	}
	validStatuses := map[string]bool{
		"pending": true, "invited": true, "responded": true,
		"shortlisted": true, "rejected": true,
	}

	if !validStatuses[status] {
		return fmt.Errorf("invalid status: %s", status)
	}

	_, err := a.db.Exec(`
		UPDATE supplier_shortlists
		SET status = ?
		WHERE id = ?
	`, status, id)
	return err
}

// RemoveSupplierFromShortlist removes a supplier from the shortlist
func (a *App) RemoveSupplierFromShortlist(id int64) error {
	if _, err := a.checkPermission(PermDelete); err != nil {
		return err
	}
	_, err := a.db.Exec("DELETE FROM supplier_shortlists WHERE id = ?", id)
	return err
}

// GetSourcingRequestStats returns statistics for a sourcing request
func (a *App) GetSourcingRequestStats(id int64) (map[string]interface{}, error) {
	stats := map[string]interface{}{}

	// Product count
	var productCount int
	a.db.QueryRow("SELECT COUNT(*) FROM sourcing_request_products WHERE sourcing_req_id = ?", id).Scan(&productCount)
	stats["productCount"] = productCount

	// Total estimated budget
	var totalBudget float64
	a.db.QueryRow("SELECT COALESCE(SUM(estimated_budget), 0) FROM sourcing_request_products WHERE sourcing_req_id = ?", id).Scan(&totalBudget)
	stats["totalBudget"] = totalBudget

	// Shortlist count by status
	rows, err := a.db.Query(`
		SELECT status, COUNT(*) FROM supplier_shortlists
		WHERE sourcing_req_id = ?
		GROUP BY status
	`, id)
	if err == nil {
		defer rows.Close()
		shortlistCounts := map[string]int{}
		for rows.Next() {
			var status string
			var count int
			rows.Scan(&status, &count)
			shortlistCounts[status] = count
		}
		stats["shortlistCounts"] = shortlistCounts
	}

	return stats, nil
}

// ConvertSourcingRequestProducts converts JSON string to products slice
func ConvertSourcingRequestProducts(productsJSON string) ([]SourcingRequestProduct, error) {
	var products []SourcingRequestProduct
	if productsJSON == "" {
		return products, nil
	}
	err := json.Unmarshal([]byte(productsJSON), &products)
	return products, err
}
