package main

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/xuri/excelize/v2"
)

// SearchResult represents a single search hit
type SearchResult struct {
	EntityType string `json:"entityType"`
	EntityID   int64  `json:"entityId"`
	Title      string `json:"title"`
	Subtitle   string `json:"subtitle"`
	Path       string `json:"path"`
}

// GlobalSearch searches across all entities
func (a *App) GlobalSearch(query string) ([]SearchResult, error) {
	if query == "" {
		return nil, nil
	}

	q := "%" + query + "%"
	var results []SearchResult

	// Suppliers
	rows, _ := a.db.Query(`SELECT id, company_name, COALESCE(email,'') FROM suppliers WHERE company_name LIKE ? OR email LIKE ? OR notes LIKE ? LIMIT 5`, q, q, q)
	if rows != nil {
		for rows.Next() {
			var r SearchResult
			var subtitle string
			if rows.Scan(&r.EntityID, &r.Title, &subtitle) == nil {
				r.EntityType = "supplier"
				r.Subtitle = subtitle
				r.Path = "suppliers"
				results = append(results, r)
			}
		}
		rows.Close()
	}

	// Products
	rows, _ = a.db.Query(`SELECT id, name, COALESCE(category,'') FROM products WHERE name LIKE ? OR category LIKE ? OR specifications LIKE ? LIMIT 5`, q, q, q)
	if rows != nil {
		for rows.Next() {
			var r SearchResult
			var subtitle string
			if rows.Scan(&r.EntityID, &r.Title, &subtitle) == nil {
				r.EntityType = "product"
				r.Subtitle = subtitle
				r.Path = "products"
				results = append(results, r)
			}
		}
		rows.Close()
	}

	// Customers
	rows, _ = a.db.Query(`SELECT id, company_name, COALESCE(email,'') FROM customers WHERE company_name LIKE ? OR email LIKE ? OR phone LIKE ? LIMIT 5`, q, q, q)
	if rows != nil {
		for rows.Next() {
			var r SearchResult
			var subtitle string
			if rows.Scan(&r.EntityID, &r.Title, &subtitle) == nil {
				r.EntityType = "customer"
				r.Subtitle = subtitle
				r.Path = "customers"
				results = append(results, r)
			}
		}
		rows.Close()
	}

	// Sourcing Requests
	rows, _ = a.db.Query(`SELECT id, title, status FROM sourcing_requests WHERE title LIKE ? OR description LIKE ? OR product_name LIKE ? LIMIT 5`, q, q, q)
	if rows != nil {
		for rows.Next() {
			var r SearchResult
			var status string
			if rows.Scan(&r.EntityID, &r.Title, &status) == nil {
				r.EntityType = "sourcing_request"
				r.Subtitle = status
				r.Path = "sourcing"
				results = append(results, r)
			}
		}
		rows.Close()
	}

	// Tenders
	rows, _ = a.db.Query(`SELECT id, title, status FROM tenders WHERE title LIKE ? OR description LIKE ? LIMIT 5`, q, q)
	if rows != nil {
		for rows.Next() {
			var r SearchResult
			var status string
			if rows.Scan(&r.EntityID, &r.Title, &status) == nil {
				r.EntityType = "tender"
				r.Subtitle = status
				r.Path = "tenders"
				results = append(results, r)
			}
		}
		rows.Close()
	}

	// Quotations
	rows, _ = a.db.Query(`SELECT q.id, q.title, s.company_name FROM quotations q LEFT JOIN suppliers s ON q.supplier_id = s.id WHERE q.title LIKE ? OR s.company_name LIKE ? LIMIT 5`, q, q)
	if rows != nil {
		for rows.Next() {
			var r SearchResult
			var subtitle string
			if rows.Scan(&r.EntityID, &r.Title, &subtitle) == nil {
				r.EntityType = "quotation"
				r.Subtitle = subtitle
				r.Path = "quotations"
				results = append(results, r)
			}
		}
		rows.Close()
	}

	// Purchase Orders
	rows, _ = a.db.Query(`SELECT po.id, po.po_number, s.company_name FROM purchase_orders po LEFT JOIN suppliers s ON po.supplier_id = s.id WHERE po.po_number LIKE ? OR s.company_name LIKE ? LIMIT 5`, q, q)
	if rows != nil {
		for rows.Next() {
			var r SearchResult
			var subtitle string
			if rows.Scan(&r.EntityID, &r.Title, &subtitle) == nil {
				r.EntityType = "purchase_order"
				r.Subtitle = subtitle
				r.Path = "purchase-orders"
				results = append(results, r)
			}
		}
		rows.Close()
	}

	return results, nil
}

// ExportData exports entity data as CSV
func (a *App) ExportData(entityType string) (string, error) {
	dir, _ := os.Getwd()
	filename := fmt.Sprintf("export_%s_%s.csv", entityType, time.Now().Format("20060102_150405"))
	csvPath := filepath.Join(dir, "exports", filename)

	os.MkdirAll(filepath.Join(dir, "exports"), 0755)

	var rows [][]string

	switch entityType {
	case "suppliers":
		rows = append(rows, []string{"ID", "Company Name", "Country", "Email", "Phone", "Website", "Notes", "Active"})
		data, err := a.GetSuppliers("")
		if err != nil {
			return "", err
		}
		for _, s := range data {
			rows = append(rows, []string{
				fmt.Sprintf("%d", s.ID), s.CompanyName, s.Country, s.Email, s.Phone, s.Website, s.Notes,
				func() string { if s.Active { return "Yes" }; return "No" }(),
			})
		}

	case "products":
		rows = append(rows, []string{"ID", "Name", "Category", "Specifications", "Grade Type", "Manufacturer", "Country of Origin", "Notes"})
		data, err := a.GetProducts("")
		if err != nil {
			return "", err
		}
		for _, p := range data {
			rows = append(rows, []string{
				fmt.Sprintf("%d", p.ID), p.Name, p.Category, p.Specifications, p.GradeType, p.Manufacturer, p.CountryOfOrigin, p.Notes,
			})
		}

	case "customers":
		rows = append(rows, []string{"ID", "Company Name", "Email", "Phone", "Address", "Website", "Notes", "Active"})
		data, err := a.GetCustomers("")
		if err != nil {
			return "", err
		}
		for _, c := range data {
			rows = append(rows, []string{
				fmt.Sprintf("%d", c.ID), c.CompanyName, c.Email, c.Phone, c.Address, c.Website, c.Notes,
				func() string { if c.Active { return "Yes" }; return "No" }(),
			})
		}

	case "purchase_orders":
		rows = append(rows, []string{"ID", "PO Number", "Supplier", "Status", "Total", "Currency", "Order Date", "Expected Delivery"})
		data, err := a.GetPurchaseOrders("all", "")
		if err != nil {
			return "", err
		}
		for _, po := range data {
			orderDate := ""
			if po.OrderDate != nil {
				orderDate = *po.OrderDate
			}
			expected := ""
			if po.ExpectedDelivery != nil {
				expected = *po.ExpectedDelivery
			}
			rows = append(rows, []string{
				fmt.Sprintf("%d", po.ID), po.PONumber, po.SupplierName, po.Status,
				fmt.Sprintf("%.2f", po.TotalAmount), po.Currency, orderDate, expected,
			})
		}

	case "quotations":
		rows = append(rows, []string{"ID", "Title", "Supplier", "Status", "Currency", "Valid Until"})
		data, err := a.GetQuotations("all", "")
		if err != nil {
			return "", err
		}
		for _, q := range data {
			validUntil := ""
			if q.ValidityDate != nil {
				validUntil = *q.ValidityDate
			}
			rows = append(rows, []string{
				fmt.Sprintf("%d", q.ID), q.Title, q.SupplierName, q.Status, q.Currency, validUntil,
			})
		}

	case "sourcing_requests":
		rows = append(rows, []string{"ID", "Title", "Status", "Priority", "Budget", "Target Date"})
		data, err := a.GetSourcingRequests("all", "")
		if err != nil {
			return "", err
		}
		for _, sr := range data {
			rows = append(rows, []string{
				fmt.Sprintf("%d", sr.ID), sr.Title, sr.Status, sr.Priority,
				fmt.Sprintf("%.2f", sr.Budget), sr.TargetDate,
			})
		}

	default:
		return "", fmt.Errorf("unknown entity type: %s", entityType)
	}

	// Write CSV
	file, err := os.Create(csvPath)
	if err != nil {
		return "", err
	}
	defer file.Close()

	for i, row := range rows {
		for j, cell := range row {
			if j > 0 {
				file.WriteString(",")
			}
			// Quote cells containing commas
			containsComma := false
			for _, c := range cell {
				if c == ',' || c == '"' || c == '\n' {
					containsComma = true
					break
				}
			}
			if containsComma {
				file.WriteString(fmt.Sprintf(`"%s"`, cell))
			} else {
				file.WriteString(cell)
			}
		}
		if i < len(rows)-1 {
			file.WriteString("\n")
		}
	}

	return csvPath, nil
}

// ExportDataXLSX exports entity data as XLSX
func (a *App) ExportDataXLSX(entityType string) (string, error) {
	dir, _ := os.Getwd()
	filename := fmt.Sprintf("export_%s_%s.xlsx", entityType, time.Now().Format("20060102_150405"))
	filePath := filepath.Join(dir, "exports", filename)

	os.MkdirAll(filepath.Join(dir, "exports"), 0755)

	f := excelize.NewFile()
	sheet := "Sheet1"
	f.SetSheetName(f.GetSheetName(1), sheet)

	switch entityType {
	case "suppliers":
		f.SetSheetRow(sheet, "A1", &[]interface{}{"ID", "Company Name", "Country", "Email", "Phone", "Website", "Notes", "Active"})
		data, _ := a.GetSuppliers("")
		for i, s := range data {
			active := "No"
			if s.Active {
				active = "Yes"
			}
			f.SetSheetRow(sheet, fmt.Sprintf("A%d", i+2), &[]interface{}{s.ID, s.CompanyName, s.Country, s.Email, s.Phone, s.Website, s.Notes, active})
		}

	case "products":
		f.SetSheetRow(sheet, "A1", &[]interface{}{"ID", "Name", "Category", "Specifications", "Grade Type", "Manufacturer", "Country of Origin", "Notes"})
		data, _ := a.GetProducts("")
		for i, p := range data {
			f.SetSheetRow(sheet, fmt.Sprintf("A%d", i+2), &[]interface{}{p.ID, p.Name, p.Category, p.Specifications, p.GradeType, p.Manufacturer, p.CountryOfOrigin, p.Notes})
		}

	case "customers":
		f.SetSheetRow(sheet, "A1", &[]interface{}{"ID", "Company Name", "Email", "Phone", "Address", "Website", "Notes", "Active"})
		data, _ := a.GetCustomers("")
		for i, c := range data {
			active := "No"
			if c.Active {
				active = "Yes"
			}
			f.SetSheetRow(sheet, fmt.Sprintf("A%d", i+2), &[]interface{}{c.ID, c.CompanyName, c.Email, c.Phone, c.Address, c.Website, c.Notes, active})
		}

	case "purchase_orders":
		f.SetSheetRow(sheet, "A1", &[]interface{}{"ID", "PO Number", "Supplier", "Status", "Total", "Currency"})
		data, _ := a.GetPurchaseOrders("all", "")
		for i, po := range data {
			f.SetSheetRow(sheet, fmt.Sprintf("A%d", i+2), &[]interface{}{po.ID, po.PONumber, po.SupplierName, po.Status, po.TotalAmount, po.Currency})
		}

	case "quotations":
		f.SetSheetRow(sheet, "A1", &[]interface{}{"ID", "Title", "Supplier", "Status", "Currency", "Valid Until"})
		data, _ := a.GetQuotations("all", "")
		for i, q := range data {
			validUntil := ""
			if q.ValidityDate != nil {
				validUntil = *q.ValidityDate
			}
			f.SetSheetRow(sheet, fmt.Sprintf("A%d", i+2), &[]interface{}{q.ID, q.Title, q.SupplierName, q.Status, q.Currency, validUntil})
		}

	case "sourcing_requests":
		f.SetSheetRow(sheet, "A1", &[]interface{}{"ID", "Title", "Status", "Priority", "Budget", "Target Date"})
		data, _ := a.GetSourcingRequests("all", "")
		for i, sr := range data {
			f.SetSheetRow(sheet, fmt.Sprintf("A%d", i+2), &[]interface{}{sr.ID, sr.Title, sr.Status, sr.Priority, sr.Budget, sr.TargetDate})
		}

	default:
		return "", fmt.Errorf("unknown entity type: %s", entityType)
	}

	if err := f.SaveAs(filePath); err != nil {
		return "", err
	}

	return filePath, nil
}
