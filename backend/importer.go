package main

import (
	"bytes"
	"encoding/csv"
	"fmt"
	"strings"
	"time"

	"github.com/xuri/excelize/v2"
)

// ImportPreview represents the preview of imported data
type ImportPreview struct {
	Headers    []string   `json:"headers"`
	Rows       [][]string `json:"rows"`
	TotalRows  int        `json:"totalRows"`
	TargetType string     `json:"targetType"`
	FileName   string     `json:"fileName"`
}

// ColumnMapping maps CSV columns to database fields
type ColumnMapping struct {
	ColumnIndex int    `json:"columnIndex"`
	ColumnName  string `json:"columnName"`
	FieldName   string `json:"fieldName"`
}

// ImportValidation validates rows before import
type ImportValidation struct {
	RowIndex int      `json:"rowIndex"`
	Errors   []string `json:"errors"`
}

// ImportExecuteRequest executes the import with mappings
type ImportExecuteRequest struct {
	FileName   string          `json:"fileName"`
	TargetType string          `json:"targetType"`
	Mappings   []ColumnMapping `json:"mappings"`
	Rows       [][]string      `json:"rows"`
}

// ImportResult represents the result of an import
type ImportResult struct {
	ImportID     int64  `json:"importId"`
	TotalRows    int    `json:"totalRows"`
	ImportedRows int    `json:"importedRows"`
	SkippedRows  int    `json:"skippedRows"`
	ErrorRows    int    `json:"errorRows"`
	Status       string `json:"status"`
}

// ImportJob represents an import history record
type ImportJob struct {
	ID             int64      `json:"id"`
	FileName       string     `json:"fileName"`
	FileType       string     `json:"fileType"`
	EntityType     string     `json:"entityType"`
	Status         string     `json:"status"`
	TotalRows      int        `json:"totalRows"`
	SuccessfulRows int        `json:"successfulRows"`
	FailedRows     int        `json:"failedRows"`
	CreatedAt      time.Time  `json:"createdAt"`
	CompletedAt    *time.Time `json:"completedAt,omitempty"`
}

// ParseFile parses CSV or XLSX file and returns preview data
func (a *App) ParseFile(fileName string, fileData []byte, targetType string) (*ImportPreview, error) {
	var headers []string
	var rows [][]string

	ext := strings.ToLower(fileName)
	if strings.HasSuffix(ext, ".csv") {
		reader := csv.NewReader(bytes.NewReader(fileData))
		records, err := reader.ReadAll()
		if err != nil {
			return nil, fmt.Errorf("failed to parse CSV: %w", err)
		}
		if len(records) > 0 {
			headers = records[0]
			rows = records[1:]
		}
	} else if strings.HasSuffix(ext, ".xlsx") || strings.HasSuffix(ext, ".xls") {
		f, err := excelize.OpenReader(bytes.NewReader(fileData))
		if err != nil {
			return nil, fmt.Errorf("failed to parse Excel file: %w", err)
		}
		defer f.Close()

		sheets := f.GetSheetList()
		if len(sheets) == 0 {
			return nil, fmt.Errorf("no sheets found in Excel file")
		}

		allRows, err := f.GetRows(sheets[0])
		if err != nil {
			return nil, fmt.Errorf("failed to read Excel sheet: %w", err)
		}

		if len(allRows) > 0 {
			headers = allRows[0]
			rows = allRows[1:]
		}
	} else {
		return nil, fmt.Errorf("unsupported file format: %s (use CSV or XLSX)", ext)
	}

	previewRows := rows
	if len(previewRows) > 100 {
		previewRows = previewRows[:100]
	}

	return &ImportPreview{
		Headers:    headers,
		Rows:       previewRows,
		TotalRows:  len(rows),
		TargetType: targetType,
		FileName:   fileName,
	}, nil
}

// ValidateImport validates rows based on column mappings
func (a *App) ValidateImport(targetType string, mappings []ColumnMapping, rows [][]string) []ImportValidation {
	var validations []ImportValidation

	for i, row := range rows {
		var errors []string

		for _, m := range mappings {
			if m.FieldName == "" {
				continue
			}
			if m.ColumnIndex >= len(row) {
				continue
			}

			value := strings.TrimSpace(row[m.ColumnIndex])
			switch targetType {
			case "suppliers":
				switch m.FieldName {
				case "companyName":
					if value == "" {
						errors = append(errors, "Company name is required")
					}
				case "email":
					if value != "" && !strings.Contains(value, "@") {
						errors = append(errors, "Invalid email format")
					}
				}
			case "products":
				switch m.FieldName {
				case "name":
					if value == "" {
						errors = append(errors, "Product name is required")
					}
				}
			}
		}

		if len(errors) > 0 {
			validations = append(validations, ImportValidation{
				RowIndex: i,
				Errors:   errors,
			})
		}
	}

	return validations
}

// ExecuteImport performs the actual import
func (a *App) ExecuteImport(req ImportExecuteRequest) (*ImportResult, error) {
	// Create import job first
	fileType := "csv"
	if strings.HasSuffix(strings.ToLower(req.FileName), ".xlsx") {
		fileType = "xlsx"
	}

	result, err := a.db.Exec(`
		INSERT INTO import_jobs (file_name, file_type, entity_type, status, total_rows, successful_rows, failed_rows, created_at)
		VALUES (?, ?, ?, 'processing', ?, 0, 0, ?)
	`, req.FileName, fileType, req.TargetType, len(req.Rows), time.Now())
	if err != nil {
		return nil, fmt.Errorf("failed to create import job: %w", err)
	}

	jobID, _ := result.LastInsertId()
	imported := 0
	skipped := 0
	errorCount := 0
	var errorMessages []string

	for i, row := range req.Rows {
		record := make(map[string]string)
		for _, m := range req.Mappings {
			if m.FieldName == "" || m.ColumnIndex >= len(row) {
				continue
			}
			record[m.FieldName] = strings.TrimSpace(row[m.ColumnIndex])
		}

		var importErr error
		switch req.TargetType {
		case "suppliers":
			if record["companyName"] != "" {
				existing, _ := a.GetSuppliers(record["companyName"])
				if len(existing) > 0 {
					skipped++
					continue
				}
			}
			_, importErr = a.createSupplierFromImport(record)
		case "products":
			if record["name"] != "" {
				existing, _ := a.GetProducts(record["name"])
				if len(existing) > 0 {
					skipped++
					continue
				}
			}
			_, importErr = a.createProductFromImport(record)
		}

		if importErr != nil {
			errorCount++
			errorMsg := fmt.Sprintf("Row %d: %s", i+1, importErr.Error())
			errorMessages = append(errorMessages, errorMsg)

			// Save error to import_job_errors
			a.db.Exec(`
				INSERT INTO import_job_errors (import_job_id, row_number, error_message, raw_data)
				VALUES (?, ?, ?, ?)
			`, jobID, i+1, errorMsg, strings.Join(row, ","))
		} else {
			imported++
		}
	}

	// Update import job
	status := "completed"
	if errorCount > 0 {
		status = "completed_with_errors"
	}
	completedAt := time.Now()

	a.db.Exec(`
		UPDATE import_jobs
		SET status = ?, successful_rows = ?, failed_rows = ?, completed_at = ?
		WHERE id = ?
	`, status, imported, errorCount, completedAt, jobID)

	return &ImportResult{
		ImportID:     jobID,
		TotalRows:    len(req.Rows),
		ImportedRows: imported,
		SkippedRows:  skipped,
		ErrorRows:    errorCount,
		Status:       status,
	}, nil
}

// createSupplierFromImport creates a supplier from imported record
func (a *App) createSupplierFromImport(record map[string]string) (int64, error) {
	result, err := a.db.Exec(`
		INSERT INTO suppliers (company_name, country, address, website, email, phone, supplier_type, notes)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`,
		record["companyName"],
		record["country"],
		record["address"],
		record["website"],
		record["email"],
		record["phone"],
		record["supplierType"],
		record["notes"],
	)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

// createProductFromImport creates a product from imported record
func (a *App) createProductFromImport(record map[string]string) (int64, error) {
	result, err := a.db.Exec(`
		INSERT INTO products (name, category, specifications, grade_type, manufacturer, country_of_origin, notes)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`,
		record["name"],
		record["category"],
		record["specifications"],
		record["gradeType"],
		record["manufacturer"],
		record["countryOfOrigin"],
		record["notes"],
	)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

// GetImportHistory returns import history
func (a *App) GetImportHistory(limit int) ([]ImportJob, error) {
	if limit <= 0 {
		limit = 50
	}
	rows, err := a.db.Query(`
		SELECT id, file_name, file_type, entity_type, status, total_rows, successful_rows, failed_rows, created_at, completed_at
		FROM import_jobs
		ORDER BY created_at DESC
		LIMIT ?
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var jobs []ImportJob
	for rows.Next() {
		var job ImportJob
		if err := rows.Scan(&job.ID, &job.FileName, &job.FileType, &job.EntityType, &job.Status, &job.TotalRows, &job.SuccessfulRows, &job.FailedRows, &job.CreatedAt, &job.CompletedAt); err != nil {
			return nil, err
		}
		jobs = append(jobs, job)
	}
	return jobs, nil
}

// GetImportTemplate returns a template for import
func (a *App) GetImportTemplate(targetType string) (*ImportPreview, error) {
	var headers []string

	switch targetType {
	case "suppliers":
		headers = []string{"Company Name", "Country", "Address", "Website", "Email", "Phone", "Supplier Type", "Notes"}
	case "products":
		headers = []string{"Product Name", "Category", "Specifications", "Grade Type", "Manufacturer", "Country of Origin", "Notes"}
	default:
		return nil, fmt.Errorf("unknown target type: %s", targetType)
	}

	return &ImportPreview{
		Headers:    headers,
		Rows:       nil,
		TotalRows:  0,
		TargetType: targetType,
		FileName:   fmt.Sprintf("%s_template.csv", targetType),
	}, nil
}

// ExportToCSV exports data to CSV format
func (a *App) ExportToCSV(targetType string) ([]byte, string, error) {
	var headers []string
	var rows [][]string

	switch targetType {
	case "suppliers":
		suppliers, err := a.GetSuppliers("")
		if err != nil {
			return nil, "", err
		}
		headers = []string{"Company Name", "Country", "Address", "Website", "Email", "Phone", "Supplier Type", "Notes"}
		for _, s := range suppliers {
			rows = append(rows, []string{
				s.CompanyName, s.Country, s.Address, s.Website, s.Email, s.Phone, s.SupplierType, s.Notes,
			})
		}
	case "products":
		products, err := a.GetProducts("")
		if err != nil {
			return nil, "", err
		}
		headers = []string{"Product Name", "Category", "Specifications", "Grade Type", "Manufacturer", "Country of Origin", "Notes"}
		for _, p := range products {
			rows = append(rows, []string{
				p.Name, p.Category, p.Specifications, p.GradeType, p.Manufacturer, p.CountryOfOrigin, p.Notes,
			})
		}
	default:
		return nil, "", fmt.Errorf("unknown target type: %s", targetType)
	}

	var buf bytes.Buffer
	writer := csv.NewWriter(&buf)

	if err := writer.Write(headers); err != nil {
		return nil, "", err
	}

	for _, row := range rows {
		if err := writer.Write(row); err != nil {
			return nil, "", err
		}
	}

	writer.Flush()
	if err := writer.Error(); err != nil {
		return nil, "", err
	}

	fileName := fmt.Sprintf("%s_export_%s.csv", targetType, time.Now().Format("20060102_150405"))
	return buf.Bytes(), fileName, nil
}
