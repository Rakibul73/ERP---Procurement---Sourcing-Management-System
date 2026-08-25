package main

import (
	"fmt"
	"time"
)

// PurchaseOrder represents a purchase order
type PurchaseOrder struct {
	ID                int64     `json:"id"`
	QuotationID       *int64    `json:"quotationId"`
	SupplierID        int64     `json:"supplierId"`
	SupplierName      string    `json:"supplierName"`
	PONumber          string    `json:"poNumber"`
	Status            string    `json:"status"`
	TotalAmount       float64   `json:"totalAmount"`
	Currency          string    `json:"currency"`
	OrderDate         *string   `json:"orderDate"`
	ExpectedDelivery  *string   `json:"expectedDelivery"`
	ActualDelivery    *string   `json:"actualDelivery"`
	PaymentTerms      string    `json:"paymentTerms"`
	ShippingTerms     string    `json:"shippingTerms"`
	DeliveryAddress   string    `json:"deliveryAddress"`
	Notes             string    `json:"notes"`
	CreatedBy         *int64    `json:"createdBy"`
	CreatedByName     string    `json:"createdByName"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
}

// PurchaseOrderLineItem represents a line item in a purchase order
type PurchaseOrderLineItem struct {
	ID              int64     `json:"id"`
	PurchaseOrderID int64     `json:"purchaseOrderId"`
	ProductName     string    `json:"productName"`
	Specifications  string    `json:"specifications"`
	Quantity        int       `json:"quantity"`
	UnitPrice       float64   `json:"unitPrice"`
	TotalPrice      float64   `json:"totalPrice"`
	Notes           string    `json:"notes"`
	CreatedAt       time.Time `json:"createdAt"`
}

// POStatusTransitions defines valid status transitions
var POStatusTransitions = map[string][]string{
	"draft":     {"approved", "cancelled"},
	"approved":  {"sent", "cancelled"},
	"sent":      {"confirmed"},
	"confirmed": {"delivered"},
	"delivered": {},
	"cancelled": {},
}

// GetPurchaseOrders returns POs filtered by status and search
func (a *App) GetPurchaseOrders(status string, search string) ([]PurchaseOrder, error) {
	query := `
		SELECT po.id, po.quotation_id, po.supplier_id, s.company_name, po.po_number,
			po.status, po.total_amount, po.currency, po.order_date, po.expected_delivery,
			po.actual_delivery, po.payment_terms, po.shipping_terms, po.delivery_address,
			po.notes, po.created_by, COALESCE(u.full_name, ''), po.created_at, po.updated_at
		FROM purchase_orders po
		JOIN suppliers s ON po.supplier_id = s.id
		LEFT JOIN users u ON po.created_by = u.id
		WHERE 1=1
	`
	args := []interface{}{}

	if status != "all" && status != "" {
		query += " AND po.status = ?"
		args = append(args, status)
	}

	if search != "" {
		query += " AND (po.po_number LIKE ? OR s.company_name LIKE ?)"
		s := "%" + search + "%"
		args = append(args, s, s)
	}

	query += " ORDER BY po.created_at DESC"

	rows, err := a.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var pos []PurchaseOrder
	for rows.Next() {
		var po PurchaseOrder
		err := rows.Scan(
			&po.ID, &po.QuotationID, &po.SupplierID, &po.SupplierName, &po.PONumber,
			&po.Status, &po.TotalAmount, &po.Currency, &po.OrderDate, &po.ExpectedDelivery,
			&po.ActualDelivery, &po.PaymentTerms, &po.ShippingTerms, &po.DeliveryAddress,
			&po.Notes, &po.CreatedBy, &po.CreatedByName, &po.CreatedAt, &po.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		pos = append(pos, po)
	}

	return pos, nil
}

// GetPurchaseOrder returns a single PO
func (a *App) GetPurchaseOrder(id int64) (PurchaseOrder, error) {
	var po PurchaseOrder
	err := a.db.QueryRow(`
		SELECT po.id, po.quotation_id, po.supplier_id, s.company_name, po.po_number,
			po.status, po.total_amount, po.currency, po.order_date, po.expected_delivery,
			po.actual_delivery, po.payment_terms, po.shipping_terms, po.delivery_address,
			po.notes, po.created_by, COALESCE(u.full_name, ''), po.created_at, po.updated_at
		FROM purchase_orders po
		JOIN suppliers s ON po.supplier_id = s.id
		LEFT JOIN users u ON po.created_by = u.id
		WHERE po.id = ?
	`, id).Scan(
		&po.ID, &po.QuotationID, &po.SupplierID, &po.SupplierName, &po.PONumber,
		&po.Status, &po.TotalAmount, &po.Currency, &po.OrderDate, &po.ExpectedDelivery,
		&po.ActualDelivery, &po.PaymentTerms, &po.ShippingTerms, &po.DeliveryAddress,
		&po.Notes, &po.CreatedBy, &po.CreatedByName, &po.CreatedAt, &po.UpdatedAt,
	)
	if err != nil {
		return PurchaseOrder{}, err
	}
	return po, nil
}

// CreatePurchaseOrder creates a new PO with line items
func (a *App) CreatePurchaseOrder(po PurchaseOrder, items []PurchaseOrderLineItem) (int64, error) {
	if _, err := a.checkPermission(PermCreate); err != nil {
		return 0, err
	}
	// Generate PO number
	var count int
	a.db.QueryRow("SELECT COUNT(*) FROM purchase_orders").Scan(&count)
	poNumber := fmt.Sprintf("PO-%04d", count+1)

	if po.Status == "" {
		po.Status = "draft"
	}

	// Calculate total
	var total float64
	for _, item := range items {
		total += item.UnitPrice * float64(item.Quantity)
	}

	result, err := a.db.Exec(`
		INSERT INTO purchase_orders (quotation_id, supplier_id, po_number, status, total_amount,
			currency, order_date, expected_delivery, payment_terms, shipping_terms,
			delivery_address, notes, created_by)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, po.QuotationID, po.SupplierID, poNumber, po.Status, total,
		po.Currency, po.OrderDate, po.ExpectedDelivery, po.PaymentTerms,
		po.ShippingTerms, po.DeliveryAddress, po.Notes, po.CreatedBy)
	if err != nil {
		return 0, err
	}

	poID, err := result.LastInsertId()
	if err != nil {
		return 0, err
	}

	for _, item := range items {
		totalPrice := item.UnitPrice * float64(item.Quantity)
		_, err := a.db.Exec(`
			INSERT INTO purchase_order_line_items (purchase_order_id, product_name, specifications, quantity, unit_price, total_price, notes)
			VALUES (?, ?, ?, ?, ?, ?, ?)
		`, poID, item.ProductName, item.Specifications, item.Quantity, item.UnitPrice, totalPrice, item.Notes)
		if err != nil {
			return 0, err
		}
	}

	a.LogActivity(po.CreatedBy, "create", "purchase_order", &poID, fmt.Sprintf("Created PO %s", poNumber))
	return poID, nil
}

// UpdatePurchaseOrderStatus updates a PO's status
func (a *App) UpdatePurchaseOrderStatus(id int64, newStatus string) error {
	if _, err := a.checkPermission(PermApprove); err != nil {
		return err
	}
	var currentStatus string
	err := a.db.QueryRow("SELECT status FROM purchase_orders WHERE id = ?", id).Scan(&currentStatus)
	if err != nil {
		return err
	}

	valid := false
	for _, s := range POStatusTransitions[currentStatus] {
		if s == newStatus {
			valid = true
			break
		}
	}
	if !valid {
		return fmt.Errorf("cannot transition from %s to %s", currentStatus, newStatus)
	}

	query := "UPDATE purchase_orders SET status = ?, updated_at = CURRENT_TIMESTAMP"
	args := []interface{}{newStatus}

	if newStatus == "approved" {
		query += ", order_date = COALESCE(order_date, CURRENT_TIMESTAMP)"
	}

	query += " WHERE id = ?"
	args = append(args, id)

	_, err = a.db.Exec(query, args...)
	if err != nil {
		return err
	}

	a.LogActivity(nil, "update", "purchase_order", &id, fmt.Sprintf("Status changed from %s to %s", currentStatus, newStatus))
	return nil
}

// DeletePurchaseOrder deletes a PO and its line items
func (a *App) DeletePurchaseOrder(id int64) error {
	if _, err := a.checkPermission(PermDelete); err != nil {
		return err
	}
	_, err := a.db.Exec("DELETE FROM purchase_order_line_items WHERE purchase_order_id = ?", id)
	if err != nil {
		return err
	}

	var poNumber string
	a.db.QueryRow("SELECT po_number FROM purchase_orders WHERE id = ?", id).Scan(&poNumber)

	_, err = a.db.Exec("DELETE FROM purchase_orders WHERE id = ?", id)
	if err != nil {
		return err
	}

	a.LogActivity(nil, "delete", "purchase_order", &id, fmt.Sprintf("Deleted PO %s", poNumber))
	return nil
}

// GetPurchaseOrderLineItems returns line items for a PO
func (a *App) GetPurchaseOrderLineItems(poID int64) ([]PurchaseOrderLineItem, error) {
	rows, err := a.db.Query(`
		SELECT id, purchase_order_id, product_name, specifications, quantity, unit_price, total_price, notes, created_at
		FROM purchase_order_line_items
		WHERE purchase_order_id = ?
		ORDER BY id
	`, poID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []PurchaseOrderLineItem
	for rows.Next() {
		var item PurchaseOrderLineItem
		err := rows.Scan(
			&item.ID, &item.PurchaseOrderID, &item.ProductName, &item.Specifications,
			&item.Quantity, &item.UnitPrice, &item.TotalPrice, &item.Notes, &item.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}

	return items, nil
}
