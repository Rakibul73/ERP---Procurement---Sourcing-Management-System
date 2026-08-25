package main

import (
	"database/sql"
)

type Supplier struct {
	ID          int64  `json:"id"`
	CompanyName string `json:"companyName"`
	Country     string `json:"country"`
	Address     string `json:"address"`
	Website     string `json:"website"`
	Email       string `json:"email"`
	Phone       string `json:"phone"`
	SupplierType string `json:"supplierType"`
	Notes       string `json:"notes"`
	Active      bool   `json:"active"`
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`
}

type SupplierContact struct {
	ID         int64  `json:"id"`
	SupplierID int64  `json:"supplierId"`
	FullName   string `json:"fullName"`
	Email      string `json:"email"`
	Phone      string `json:"phone"`
	WhatsApp   string `json:"whatsapp"`
	Position   string `json:"position"`
	IsPrimary  bool   `json:"isPrimary"`
	CreatedAt  string `json:"createdAt"`
}

type SupplierDocument struct {
	ID         int64  `json:"id"`
	SupplierID int64  `json:"supplierId"`
	FileName   string `json:"fileName"`
	FilePath   string `json:"filePath"`
	FileType   string `json:"fileType"`
	Description string `json:"description"`
	CreatedAt  string `json:"createdAt"`
}

type SupplierNote struct {
	ID         int64  `json:"id"`
	SupplierID int64  `json:"supplierId"`
	Content    string `json:"content"`
	UserID     *int64 `json:"userId"`
	CreatedAt  string `json:"createdAt"`
}

func (a *App) GetSuppliers(search string) ([]Supplier, error) {
	query := `SELECT id, company_name, country, address, website, email, phone, supplier_type, notes, active, created_at, updated_at 
FROM suppliers WHERE active = 1`
	var args []interface{}

	if search != "" {
		query += ` AND (company_name LIKE ? OR country LIKE ? OR email LIKE ? OR notes LIKE ?)`
		s := "%" + search + "%"
		args = append(args, s, s, s, s)
	}

	query += ` ORDER BY company_name ASC`

	rows, err := a.db.QueryContext(a.ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var suppliers []Supplier
	for rows.Next() {
		var s Supplier
		if err := rows.Scan(&s.ID, &s.CompanyName, &s.Country, &s.Address, &s.Website, &s.Email, &s.Phone, &s.SupplierType, &s.Notes, &s.Active, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, err
		}
		suppliers = append(suppliers, s)
	}
	return suppliers, nil
}

func (a *App) GetSupplier(id int64) (*Supplier, error) {
	var s Supplier
	err := a.db.QueryRowContext(a.ctx,
		`SELECT id, company_name, country, address, website, email, phone, supplier_type, notes, active, created_at, updated_at 
FROM suppliers WHERE id = ?`, id,
	).Scan(&s.ID, &s.CompanyName, &s.Country, &s.Address, &s.Website, &s.Email, &s.Phone, &s.SupplierType, &s.Notes, &s.Active, &s.CreatedAt, &s.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	return &s, err
}

func (a *App) CreateSupplier(s Supplier) (*Supplier, error) {
	if _, err := a.checkPermission(PermCreate); err != nil {
		return nil, err
	}
	result, err := a.db.ExecContext(a.ctx,
		`INSERT INTO suppliers (company_name, country, address, website, email, phone, supplier_type, notes) 
VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		s.CompanyName, s.Country, s.Address, s.Website, s.Email, s.Phone, s.SupplierType, s.Notes,
	)
	if err != nil {
		return nil, err
	}
	id, _ := result.LastInsertId()
	return a.GetSupplier(id)
}

func (a *App) UpdateSupplier(id int64, s Supplier) error {
	if _, err := a.checkPermission(PermUpdate); err != nil {
		return err
	}
	result, err := a.db.ExecContext(a.ctx,
		`UPDATE suppliers SET company_name = ?, country = ?, address = ?, website = ?, email = ?, phone = ?, supplier_type = ?, notes = ?, updated_at = CURRENT_TIMESTAMP 
WHERE id = ?`,
		s.CompanyName, s.Country, s.Address, s.Website, s.Email, s.Phone, s.SupplierType, s.Notes, id,
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

func (a *App) DeleteSupplier(id int64) error {
	if _, err := a.checkPermission(PermDelete); err != nil {
		return err
	}
	result, err := a.db.ExecContext(a.ctx, "UPDATE suppliers SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?", id)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}

func (a *App) GetSupplierContacts(supplierID int64) ([]SupplierContact, error) {
	rows, err := a.db.QueryContext(a.ctx,
		`SELECT id, supplier_id, full_name, email, phone, whatsapp, position, is_primary, created_at 
FROM supplier_contacts WHERE supplier_id = ? ORDER BY is_primary DESC, full_name ASC`, supplierID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var contacts []SupplierContact
	for rows.Next() {
		var c SupplierContact
		if err := rows.Scan(&c.ID, &c.SupplierID, &c.FullName, &c.Email, &c.Phone, &c.WhatsApp, &c.Position, &c.IsPrimary, &c.CreatedAt); err != nil {
			return nil, err
		}
		contacts = append(contacts, c)
	}
	return contacts, nil
}

func (a *App) CreateSupplierContact(c SupplierContact) (*SupplierContact, error) {
	if _, err := a.checkPermission(PermCreate); err != nil {
		return nil, err
	}
	if c.IsPrimary {
		a.db.ExecContext(a.ctx, "UPDATE supplier_contacts SET is_primary = 0 WHERE supplier_id = ?", c.SupplierID)
	}

	result, err := a.db.ExecContext(a.ctx,
		`INSERT INTO supplier_contacts (supplier_id, full_name, email, phone, whatsapp, position, is_primary) 
VALUES (?, ?, ?, ?, ?, ?, ?)`,
		c.SupplierID, c.FullName, c.Email, c.Phone, c.WhatsApp, c.Position, c.IsPrimary,
	)
	if err != nil {
		return nil, err
	}
	id, _ := result.LastInsertId()
	c.ID = id
	return &c, nil
}

func (a *App) DeleteSupplierContact(id int64) error {
	if _, err := a.checkPermission(PermDelete); err != nil {
		return err
	}
	_, err := a.db.ExecContext(a.ctx, "DELETE FROM supplier_contacts WHERE id = ?", id)
	return err
}

func (a *App) GetSupplierNotes(supplierID int64) ([]SupplierNote, error) {
	rows, err := a.db.QueryContext(a.ctx,
		`SELECT id, supplier_id, content, user_id, created_at 
FROM supplier_notes WHERE supplier_id = ? ORDER BY created_at DESC`, supplierID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var notes []SupplierNote
	for rows.Next() {
		var n SupplierNote
		if err := rows.Scan(&n.ID, &n.SupplierID, &n.Content, &n.UserID, &n.CreatedAt); err != nil {
			return nil, err
		}
		notes = append(notes, n)
	}
	return notes, nil
}

func (a *App) CreateSupplierNote(supplierID int64, content string, userID *int64) (*SupplierNote, error) {
	if _, err := a.checkPermission(PermCreate); err != nil {
		return nil, err
	}
	result, err := a.db.ExecContext(a.ctx,
		`INSERT INTO supplier_notes (supplier_id, content, user_id) VALUES (?, ?, ?)`,
		supplierID, content, userID,
	)
	if err != nil {
		return nil, err
	}
	id, _ := result.LastInsertId()

	note := &SupplierNote{
		ID:         id,
		SupplierID: supplierID,
		Content:    content,
		UserID:     userID,
	}
	return note, nil
}
