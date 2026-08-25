package main

import (
	"fmt"
	"time"
)

type Customer struct {
	ID        int64     `json:"id"`
	CompanyName string   `json:"companyName"`
	Address   string    `json:"address"`
	Phone     string    `json:"phone"`
	Email     string    `json:"email"`
	Website   string    `json:"website"`
	Notes     string    `json:"notes"`
	Active    bool      `json:"active"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type CustomerContact struct {
	ID         int64     `json:"id"`
	CustomerID int64     `json:"customerId"`
	FullName   string    `json:"fullName"`
	Email      string    `json:"email"`
	Phone      string    `json:"phone"`
	Position   string    `json:"position"`
	IsPrimary  bool      `json:"isPrimary"`
	CreatedAt  time.Time `json:"createdAt"`
}

func (a *App) GetCustomers(search string) ([]Customer, error) {
	query := `
		SELECT id, company_name, COALESCE(address,''), COALESCE(phone,''), COALESCE(email,''),
			COALESCE(website,''), COALESCE(notes,''), active, created_at, updated_at
		FROM customers WHERE 1=1
	`
	args := []interface{}{}

	if search != "" {
		query += " AND (company_name LIKE ? OR email LIKE ? OR phone LIKE ?)"
		s := "%" + search + "%"
		args = append(args, s, s, s)
	}

	query += " ORDER BY company_name"

	rows, err := a.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var customers []Customer
	for rows.Next() {
		var c Customer
		var active int
		err := rows.Scan(&c.ID, &c.CompanyName, &c.Address, &c.Phone, &c.Email,
			&c.Website, &c.Notes, &active, &c.CreatedAt, &c.UpdatedAt)
		if err != nil {
			return nil, err
		}
		c.Active = active == 1
		customers = append(customers, c)
	}
	return customers, nil
}

func (a *App) GetCustomer(id int64) (Customer, error) {
	var c Customer
	var active int
	err := a.db.QueryRow(`
		SELECT id, company_name, COALESCE(address,''), COALESCE(phone,''), COALESCE(email,''),
			COALESCE(website,''), COALESCE(notes,''), active, created_at, updated_at
		FROM customers WHERE id = ?
	`, id).Scan(&c.ID, &c.CompanyName, &c.Address, &c.Phone, &c.Email,
		&c.Website, &c.Notes, &active, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return Customer{}, err
	}
	c.Active = active == 1
	return c, nil
}

func (a *App) CreateCustomer(c Customer) (int64, error) {
	if _, err := a.checkPermission(PermCreate); err != nil {
		return 0, err
	}
	result, err := a.db.Exec(`
		INSERT INTO customers (company_name, address, phone, email, website, notes, active)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, c.CompanyName, c.Address, c.Phone, c.Email, c.Website, c.Notes, 1)
	if err != nil {
		return 0, err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return 0, err
	}
	a.LogActivity(nil, "create", "customer", &id, fmt.Sprintf("Created customer %s", c.CompanyName))
	return id, nil
}

func (a *App) UpdateCustomer(id int64, c Customer) error {
	if _, err := a.checkPermission(PermUpdate); err != nil {
		return err
	}
	_, err := a.db.Exec(`
		UPDATE customers SET company_name=?, address=?, phone=?, email=?, website=?, notes=?, updated_at=CURRENT_TIMESTAMP
		WHERE id=?
	`, c.CompanyName, c.Address, c.Phone, c.Email, c.Website, c.Notes, id)
	if err != nil {
		return err
	}
	a.LogActivity(nil, "update", "customer", &id, fmt.Sprintf("Updated customer %s", c.CompanyName))
	return nil
}

func (a *App) DeleteCustomer(id int64) error {
	if _, err := a.checkPermission(PermDelete); err != nil {
		return err
	}
	var name string
	a.db.QueryRow("SELECT company_name FROM customers WHERE id=?", id).Scan(&name)
	_, err := a.db.Exec("DELETE FROM customers WHERE id=?", id)
	if err != nil {
		return err
	}
	a.LogActivity(nil, "delete", "customer", &id, fmt.Sprintf("Deleted customer %s", name))
	return nil
}

// Customer contacts

func (a *App) GetCustomerContacts(customerID int64) ([]CustomerContact, error) {
	rows, err := a.db.Query(`
		SELECT id, customer_id, full_name, COALESCE(email,''), COALESCE(phone,''), COALESCE(position,''), is_primary, created_at
		FROM customer_contacts WHERE customer_id = ? ORDER BY is_primary DESC, full_name
	`, customerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var contacts []CustomerContact
	for rows.Next() {
		var cc CustomerContact
		var isPrimary int
		err := rows.Scan(&cc.ID, &cc.CustomerID, &cc.FullName, &cc.Email, &cc.Phone, &cc.Position, &isPrimary, &cc.CreatedAt)
		if err != nil {
			return nil, err
		}
		cc.IsPrimary = isPrimary == 1
		contacts = append(contacts, cc)
	}
	return contacts, nil
}

func (a *App) CreateCustomerContact(cc CustomerContact) (int64, error) {
	if _, err := a.checkPermission(PermCreate); err != nil {
		return 0, err
	}
	result, err := a.db.Exec(`
		INSERT INTO customer_contacts (customer_id, full_name, email, phone, position, is_primary)
		VALUES (?, ?, ?, ?, ?, ?)
	`, cc.CustomerID, cc.FullName, cc.Email, cc.Phone, cc.Position, boolToInt(cc.IsPrimary))
	if err != nil {
		return 0, err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return 0, err
	}
	a.LogActivity(nil, "create", "customer_contact", &id, fmt.Sprintf("Added contact %s", cc.FullName))
	return id, nil
}

func (a *App) DeleteCustomerContact(id int64) error {
	if _, err := a.checkPermission(PermDelete); err != nil {
		return err
	}
	_, err := a.db.Exec("DELETE FROM customer_contacts WHERE id=?", id)
	if err != nil {
		return err
	}
	a.LogActivity(nil, "delete", "customer_contact", &id, "Deleted customer contact")
	return nil
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}
