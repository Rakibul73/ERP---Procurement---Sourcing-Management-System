package main

import (
	"database/sql"
)

type Product struct {
	ID             int64  `json:"id"`
	Name           string `json:"name"`
	Category       string `json:"category"`
	Specifications string `json:"specifications"`
	GradeType      string `json:"gradeType"`
	Manufacturer   string `json:"manufacturer"`
	CountryOfOrigin string `json:"countryOfOrigin"`
	Notes          string `json:"notes"`
	CreatedAt      string `json:"createdAt"`
	UpdatedAt      string `json:"updatedAt"`
}

type SupplierProduct struct {
	ID            int64   `json:"id"`
	SupplierID    int64   `json:"supplierId"`
	ProductID     int64   `json:"productId"`
	UnitPrice     float64 `json:"unitPrice"`
	Currency      string  `json:"currency"`
	MOQ           int     `json:"moq"`
	LeadTimeDays  int     `json:"leadTimeDays"`
	PaymentTerms  string  `json:"paymentTerms"`
	Notes         string  `json:"notes"`
	CreatedAt     string  `json:"createdAt"`
	UpdatedAt     string  `json:"updatedAt"`
	SupplierName  string  `json:"supplierName,omitempty"`
	ProductName   string  `json:"productName,omitempty"`
}

type PricingHistory struct {
	ID                int64   `json:"id"`
	SupplierProductID int64   `json:"supplierProductId"`
	Price             float64 `json:"price"`
	Currency          string  `json:"currency"`
	EffectiveDate     string  `json:"effectiveDate"`
	Notes             string  `json:"notes"`
	CreatedAt         string  `json:"createdAt"`
}

func (a *App) GetProducts(search string) ([]Product, error) {
	query := `SELECT id, name, COALESCE(category,''), COALESCE(specifications,''), COALESCE(grade_type,''), COALESCE(manufacturer,''), COALESCE(country_of_origin,''), COALESCE(notes,''), created_at, updated_at 
FROM products`
	var args []interface{}

	if search != "" {
		query += ` WHERE name LIKE ? OR category LIKE ? OR manufacturer LIKE ? OR specifications LIKE ?`
		s := "%" + search + "%"
		args = append(args, s, s, s, s)
	}

	query += ` ORDER BY name ASC`

	rows, err := a.db.QueryContext(a.ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var products []Product
	for rows.Next() {
		var p Product
		if err := rows.Scan(&p.ID, &p.Name, &p.Category, &p.Specifications, &p.GradeType, &p.Manufacturer, &p.CountryOfOrigin, &p.Notes, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		products = append(products, p)
	}
	return products, nil
}

func (a *App) GetProduct(id int64) (*Product, error) {
	var p Product
	err := a.db.QueryRowContext(a.ctx,
		`SELECT id, name, COALESCE(category,''), COALESCE(specifications,''), COALESCE(grade_type,''), COALESCE(manufacturer,''), COALESCE(country_of_origin,''), COALESCE(notes,''), created_at, updated_at 
FROM products WHERE id = ?`, id,
	).Scan(&p.ID, &p.Name, &p.Category, &p.Specifications, &p.GradeType, &p.Manufacturer, &p.CountryOfOrigin, &p.Notes, &p.CreatedAt, &p.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	return &p, err
}

func (a *App) CreateProduct(p Product) (*Product, error) {
	if _, err := a.checkPermission(PermCreate); err != nil {
		return nil, err
	}
	result, err := a.db.ExecContext(a.ctx,
		`INSERT INTO products (name, category, specifications, grade_type, manufacturer, country_of_origin, notes) 
VALUES (?, ?, ?, ?, ?, ?, ?)`,
		p.Name, p.Category, p.Specifications, p.GradeType, p.Manufacturer, p.CountryOfOrigin, p.Notes,
	)
	if err != nil {
		return nil, err
	}
	id, _ := result.LastInsertId()
	return a.GetProduct(id)
}

func (a *App) UpdateProduct(id int64, p Product) error {
	if _, err := a.checkPermission(PermUpdate); err != nil {
		return err
	}
	result, err := a.db.ExecContext(a.ctx,
		`UPDATE products SET name = ?, category = ?, specifications = ?, grade_type = ?, manufacturer = ?, country_of_origin = ?, notes = ?, updated_at = CURRENT_TIMESTAMP 
WHERE id = ?`,
		p.Name, p.Category, p.Specifications, p.GradeType, p.Manufacturer, p.CountryOfOrigin, p.Notes, id,
	)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}

func (a *App) DeleteProduct(id int64) error {
	if _, err := a.checkPermission(PermDelete); err != nil {
		return err
	}
	result, err := a.db.ExecContext(a.ctx, "DELETE FROM products WHERE id = ?", id)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}

func (a *App) GetSupplierProducts(supplierID int64) ([]SupplierProduct, error) {
	rows, err := a.db.QueryContext(a.ctx,
		`SELECT sp.id, sp.supplier_id, sp.product_id, sp.unit_price, sp.currency, sp.moq, sp.lead_time_days, sp.payment_terms, COALESCE(sp.notes,''), sp.created_at, sp.updated_at,
s.company_name, p.name
FROM supplier_products sp
JOIN suppliers s ON sp.supplier_id = s.id
JOIN products p ON sp.product_id = p.id
WHERE sp.supplier_id = ? ORDER BY p.name ASC`, supplierID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []SupplierProduct
	for rows.Next() {
		var sp SupplierProduct
		if err := rows.Scan(&sp.ID, &sp.SupplierID, &sp.ProductID, &sp.UnitPrice, &sp.Currency, &sp.MOQ, &sp.LeadTimeDays, &sp.PaymentTerms, &sp.Notes, &sp.CreatedAt, &sp.UpdatedAt, &sp.SupplierName, &sp.ProductName); err != nil {
			return nil, err
		}
		items = append(items, sp)
	}
	return items, nil
}

func (a *App) GetProductSuppliers(productID int64) ([]SupplierProduct, error) {
	rows, err := a.db.QueryContext(a.ctx,
		`SELECT sp.id, sp.supplier_id, sp.product_id, sp.unit_price, sp.currency, sp.moq, sp.lead_time_days, sp.payment_terms, COALESCE(sp.notes,''), sp.created_at, sp.updated_at,
s.company_name, p.name
FROM supplier_products sp
JOIN suppliers s ON sp.supplier_id = s.id
JOIN products p ON sp.product_id = p.id
WHERE sp.product_id = ? ORDER BY s.company_name ASC`, productID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []SupplierProduct
	for rows.Next() {
		var sp SupplierProduct
		if err := rows.Scan(&sp.ID, &sp.SupplierID, &sp.ProductID, &sp.UnitPrice, &sp.Currency, &sp.MOQ, &sp.LeadTimeDays, &sp.PaymentTerms, &sp.Notes, &sp.CreatedAt, &sp.UpdatedAt, &sp.SupplierName, &sp.ProductName); err != nil {
			return nil, err
		}
		items = append(items, sp)
	}
	return items, nil
}

func (a *App) LinkSupplierProduct(sp SupplierProduct) (*SupplierProduct, error) {
	if _, err := a.checkPermission(PermCreate); err != nil {
		return nil, err
	}
	var exists int
	err := a.db.QueryRowContext(a.ctx,
		"SELECT COUNT(*) FROM supplier_products WHERE supplier_id = ? AND product_id = ?",
		sp.SupplierID, sp.ProductID).Scan(&exists)
	if err != nil {
		return nil, err
	}
	if exists > 0 {
		result, err := a.db.ExecContext(a.ctx,
			`UPDATE supplier_products SET unit_price = ?, currency = ?, moq = ?, lead_time_days = ?, payment_terms = ?, notes = ?, updated_at = CURRENT_TIMESTAMP 
WHERE supplier_id = ? AND product_id = ?`,
			sp.UnitPrice, sp.Currency, sp.MOQ, sp.LeadTimeDays, sp.PaymentTerms, sp.Notes, sp.SupplierID, sp.ProductID,
		)
		if err != nil {
			return nil, err
		}
		id, _ := result.LastInsertId()
		sp.ID = id
		return &sp, nil
	}

	result, err := a.db.ExecContext(a.ctx,
		`INSERT INTO supplier_products (supplier_id, product_id, unit_price, currency, moq, lead_time_days, payment_terms, notes) 
VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		sp.SupplierID, sp.ProductID, sp.UnitPrice, sp.Currency, sp.MOQ, sp.LeadTimeDays, sp.PaymentTerms, sp.Notes,
	)
	if err != nil {
		return nil, err
	}
	id, _ := result.LastInsertId()
	sp.ID = id
	return &sp, nil
}

func (a *App) UnlinkSupplierProduct(id int64) error {
	if _, err := a.checkPermission(PermDelete); err != nil {
		return err
	}
	_, err := a.db.ExecContext(a.ctx, "DELETE FROM supplier_products WHERE id = ?", id)
	return err
}

func (a *App) GetPricingHistory(supplierProductID int64) ([]PricingHistory, error) {
	rows, err := a.db.QueryContext(a.ctx,
		`SELECT id, supplier_product_id, price, currency, effective_date, COALESCE(notes,''), created_at 
FROM pricing_history WHERE supplier_product_id = ? ORDER BY effective_date DESC`, supplierProductID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var history []PricingHistory
	for rows.Next() {
		var h PricingHistory
		if err := rows.Scan(&h.ID, &h.SupplierProductID, &h.Price, &h.Currency, &h.EffectiveDate, &h.Notes, &h.CreatedAt); err != nil {
			return nil, err
		}
		history = append(history, h)
	}
	return history, nil
}

func (a *App) AddPricingHistory(h PricingHistory) (*PricingHistory, error) {
	if _, err := a.checkPermission(PermCreate); err != nil {
		return nil, err
	}
	result, err := a.db.ExecContext(a.ctx,
		`INSERT INTO pricing_history (supplier_product_id, price, currency, effective_date, notes) 
VALUES (?, ?, ?, ?, ?)`,
		h.SupplierProductID, h.Price, h.Currency, h.EffectiveDate, h.Notes,
	)
	if err != nil {
		return nil, err
	}
	id, _ := result.LastInsertId()
	h.ID = id
	return &h, nil
}
