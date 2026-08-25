package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

type App struct {
	ctx          context.Context
	db           *sql.DB
	currentUser  *User
}

func NewApp() (*App, error) {
	return &App{}, nil
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	dataDir, err := os.UserConfigDir()
	if err != nil {
		log.Printf("Failed to get config dir: %v", err)
		return
	}

	erpDir := filepath.Join(dataDir, "ERP")
	if err := os.MkdirAll(erpDir, 0755); err != nil {
		log.Printf("Failed to create data dir: %v", err)
		return
	}

	dbPath := filepath.Join(erpDir, "data.db")
	db, err := sql.Open("sqlite", dbPath+"?_journal_mode=WAL&_busy_timeout=5000")
	if err != nil {
		log.Printf("Failed to open database: %v", err)
		return
	}

	if err := db.PingContext(ctx); err != nil {
		log.Printf("Failed to ping database: %v", err)
		return
	}

	a.db = db

	// Check for schema compatibility — if old schema detected, drop and recreate
	if err := a.checkSchema(ctx); err != nil {
		log.Printf("Schema incompatible, recreating database: %v", err)
		a.dropAllTables(ctx)
	}

	if err := a.runMigrations(ctx); err != nil {
		log.Printf("Failed to run migrations: %v", err)
		return
	}

	a.maybeSeed()
}

func (a *App) shutdown(ctx context.Context) {
	if a.db != nil {
		a.db.Close()
	}
}

func (a *App) runMigrations(ctx context.Context) error {
	_, err := a.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			username TEXT NOT NULL UNIQUE,
			email TEXT NOT NULL UNIQUE,
			password_hash TEXT NOT NULL,
			full_name TEXT NOT NULL,
			role TEXT NOT NULL DEFAULT 'user',
			active INTEGER NOT NULL DEFAULT 1,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);

		CREATE TABLE IF NOT EXISTS organizations (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			address TEXT,
			phone TEXT,
			email TEXT,
			website TEXT,
			logo_path TEXT,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);

		CREATE TABLE IF NOT EXISTS activity_log (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER,
			action TEXT NOT NULL,
			entity_type TEXT,
			entity_id INTEGER,
			details TEXT,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id)
		);

		CREATE TABLE IF NOT EXISTS extraction_config (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			provider TEXT NOT NULL DEFAULT 'openai',
			api_key TEXT,
			model TEXT DEFAULT 'gpt-4o',
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);

		CREATE TABLE IF NOT EXISTS suppliers (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			company_name TEXT NOT NULL,
			country TEXT,
			address TEXT,
			website TEXT,
			email TEXT,
			phone TEXT,
			supplier_type TEXT,
			notes TEXT,
			active INTEGER NOT NULL DEFAULT 1,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);

		CREATE TABLE IF NOT EXISTS supplier_contacts (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			supplier_id INTEGER NOT NULL,
			full_name TEXT NOT NULL,
			email TEXT,
			phone TEXT,
			whatsapp TEXT,
			position TEXT,
			is_primary INTEGER NOT NULL DEFAULT 0,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
		);

		CREATE TABLE IF NOT EXISTS supplier_documents (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			supplier_id INTEGER NOT NULL,
			file_name TEXT NOT NULL,
			file_path TEXT NOT NULL,
			file_type TEXT,
			description TEXT,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
		);

		CREATE TABLE IF NOT EXISTS supplier_notes (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			supplier_id INTEGER NOT NULL,
			content TEXT NOT NULL,
			user_id INTEGER,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
			FOREIGN KEY (user_id) REFERENCES users(id)
		);

		CREATE TABLE IF NOT EXISTS products (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			category TEXT,
			specifications TEXT,
			grade_type TEXT,
			manufacturer TEXT,
			country_of_origin TEXT,
			notes TEXT,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);

		CREATE TABLE IF NOT EXISTS product_documents (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			product_id INTEGER NOT NULL,
			file_name TEXT NOT NULL,
			file_path TEXT NOT NULL,
			file_type TEXT,
			description TEXT,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
		);

		CREATE TABLE IF NOT EXISTS supplier_products (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			supplier_id INTEGER NOT NULL,
			product_id INTEGER NOT NULL,
			unit_price REAL,
			currency TEXT DEFAULT 'USD',
			moq INTEGER,
			lead_time_days INTEGER,
			payment_terms TEXT,
			notes TEXT,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
			FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
			UNIQUE(supplier_id, product_id)
		);

		CREATE TABLE IF NOT EXISTS pricing_history (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			supplier_product_id INTEGER NOT NULL,
			price REAL NOT NULL,
			currency TEXT NOT NULL DEFAULT 'USD',
			effective_date DATETIME NOT NULL,
			notes TEXT,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (supplier_product_id) REFERENCES supplier_products(id) ON DELETE CASCADE
		);

		CREATE TABLE IF NOT EXISTS documents (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			entity_type TEXT NOT NULL,
			entity_id INTEGER NOT NULL,
			file_name TEXT NOT NULL,
			file_path TEXT NOT NULL,
			file_type TEXT,
			description TEXT,
			uploaded_by INTEGER,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (uploaded_by) REFERENCES users(id)
		);

		CREATE TABLE IF NOT EXISTS sourcing_requests (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			title TEXT NOT NULL,
			description TEXT,
			priority TEXT DEFAULT 'medium',
			target_date DATETIME,
			budget REAL DEFAULT 0,
			currency TEXT DEFAULT 'USD',
			status TEXT NOT NULL DEFAULT 'draft',
			created_by INTEGER,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (created_by) REFERENCES users(id)
		);

		CREATE TABLE IF NOT EXISTS sourcing_request_attachments (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			sourcing_request_id INTEGER NOT NULL,
			file_name TEXT NOT NULL,
			file_path TEXT NOT NULL,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (sourcing_request_id) REFERENCES sourcing_requests(id) ON DELETE CASCADE
		);

		CREATE TABLE IF NOT EXISTS shortlists (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			sourcing_request_id INTEGER NOT NULL,
			name TEXT NOT NULL,
			notes TEXT,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (sourcing_request_id) REFERENCES sourcing_requests(id) ON DELETE CASCADE
		);

		CREATE TABLE IF NOT EXISTS shortlist_suppliers (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			shortlist_id INTEGER NOT NULL,
			supplier_id INTEGER NOT NULL,
			contacted INTEGER NOT NULL DEFAULT 0,
			contacted_at DATETIME,
			response_received INTEGER NOT NULL DEFAULT 0,
			response_notes TEXT,
			selected INTEGER NOT NULL DEFAULT 0,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (shortlist_id) REFERENCES shortlists(id) ON DELETE CASCADE,
			FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
		);

		CREATE TABLE IF NOT EXISTS sourcing_request_products (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			sourcing_req_id INTEGER NOT NULL,
			product_id INTEGER NOT NULL,
			quantity REAL NOT NULL DEFAULT 0,
			unit TEXT DEFAULT 'pcs',
			specifications TEXT,
			estimated_budget REAL DEFAULT 0,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (sourcing_req_id) REFERENCES sourcing_requests(id) ON DELETE CASCADE,
			FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
		);

		CREATE TABLE IF NOT EXISTS supplier_shortlists (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			sourcing_req_id INTEGER NOT NULL,
			supplier_id INTEGER NOT NULL,
			status TEXT NOT NULL DEFAULT 'pending',
			notes TEXT,
			ranking INTEGER DEFAULT 0,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (sourcing_req_id) REFERENCES sourcing_requests(id) ON DELETE CASCADE,
			FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
			UNIQUE(sourcing_req_id, supplier_id)
		);

		CREATE TABLE IF NOT EXISTS tenders (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			title TEXT NOT NULL,
			sourcing_request_id INTEGER,
			deadline DATETIME,
			status TEXT NOT NULL DEFAULT 'draft',
			notes TEXT,
			created_by INTEGER,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (sourcing_request_id) REFERENCES sourcing_requests(id),
			FOREIGN KEY (created_by) REFERENCES users(id)
		);

		CREATE TABLE IF NOT EXISTS tender_items (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			tender_id INTEGER NOT NULL,
			product_name TEXT NOT NULL,
			specifications TEXT,
			quantity INTEGER,
			unit TEXT,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (tender_id) REFERENCES tenders(id) ON DELETE CASCADE
		);

		CREATE TABLE IF NOT EXISTS tender_suppliers (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			tender_id INTEGER NOT NULL,
			supplier_id INTEGER NOT NULL,
			status TEXT NOT NULL DEFAULT 'invited',
			response_date DATETIME,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (tender_id) REFERENCES tenders(id) ON DELETE CASCADE,
			FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
		);

		CREATE TABLE IF NOT EXISTS quotations (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			tender_id INTEGER,
			supplier_id INTEGER NOT NULL,
			sourcing_request_id INTEGER,
			title TEXT,
			status TEXT NOT NULL DEFAULT 'received',
			currency TEXT NOT NULL DEFAULT 'USD',
			validity_date DATETIME,
			shipping_terms TEXT,
			payment_terms TEXT,
			lead_time_days INTEGER,
			notes TEXT,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (tender_id) REFERENCES tenders(id),
			FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
			FOREIGN KEY (sourcing_request_id) REFERENCES sourcing_requests(id)
		);

		CREATE TABLE IF NOT EXISTS quotation_line_items (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			quotation_id INTEGER NOT NULL,
			product_name TEXT NOT NULL,
			specifications TEXT,
			quantity INTEGER,
			unit_price REAL,
			moq INTEGER,
			lead_time_days INTEGER,
			notes TEXT,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE
		);

		CREATE TABLE IF NOT EXISTS purchase_orders (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			quotation_id INTEGER,
			supplier_id INTEGER NOT NULL,
			po_number TEXT UNIQUE,
			status TEXT NOT NULL DEFAULT 'draft',
			total_amount REAL,
			currency TEXT NOT NULL DEFAULT 'USD',
			order_date DATETIME,
			expected_delivery DATETIME,
			actual_delivery DATETIME,
			payment_terms TEXT,
			shipping_terms TEXT,
			delivery_address TEXT,
			notes TEXT,
			created_by INTEGER,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (quotation_id) REFERENCES quotations(id),
			FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
			FOREIGN KEY (created_by) REFERENCES users(id)
		);

		CREATE TABLE IF NOT EXISTS purchase_order_line_items (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			purchase_order_id INTEGER NOT NULL,
			product_name TEXT NOT NULL,
			specifications TEXT,
			quantity INTEGER,
			unit_price REAL,
			total_price REAL,
			notes TEXT,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
		);

		CREATE TABLE IF NOT EXISTS customers (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			company_name TEXT NOT NULL,
			address TEXT,
			phone TEXT,
			email TEXT,
			website TEXT,
			notes TEXT,
			active INTEGER NOT NULL DEFAULT 1,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);

		CREATE TABLE IF NOT EXISTS customer_contacts (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			customer_id INTEGER NOT NULL,
			full_name TEXT NOT NULL,
			email TEXT,
			phone TEXT,
			position TEXT,
			is_primary INTEGER NOT NULL DEFAULT 0,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
		);

		CREATE TABLE IF NOT EXISTS customer_requirements (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			customer_id INTEGER NOT NULL,
			product_name TEXT,
			specifications TEXT,
			quantity INTEGER,
			target_price REAL,
			notes TEXT,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
		);

		CREATE TABLE IF NOT EXISTS import_jobs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			file_name TEXT NOT NULL,
			file_type TEXT NOT NULL,
			entity_type TEXT NOT NULL,
			status TEXT NOT NULL DEFAULT 'pending',
			total_rows INTEGER DEFAULT 0,
			successful_rows INTEGER DEFAULT 0,
			failed_rows INTEGER DEFAULT 0,
			imported_by INTEGER,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			completed_at DATETIME,
			FOREIGN KEY (imported_by) REFERENCES users(id)
		);

		CREATE TABLE IF NOT EXISTS import_job_errors (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			import_job_id INTEGER NOT NULL,
			row_number INTEGER,
			error_message TEXT,
			raw_data TEXT,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (import_job_id) REFERENCES import_jobs(id) ON DELETE CASCADE
		);

		CREATE TABLE IF NOT EXISTS communications (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			entity_type TEXT NOT NULL,
			entity_id INTEGER NOT NULL,
			direction TEXT NOT NULL DEFAULT 'outbound',
			channel TEXT NOT NULL DEFAULT 'email',
			subject TEXT,
			content TEXT,
			status TEXT DEFAULT 'sent',
			contact_name TEXT,
			contact_email TEXT,
			contact_phone TEXT,
			attachments TEXT,
			created_by INTEGER,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (created_by) REFERENCES users(id)
		);

		CREATE VIRTUAL TABLE IF NOT EXISTS suppliers_fts USING fts5(
			company_name, country, email, notes, website,
			content=suppliers, content_rowid=id
		);

		CREATE VIRTUAL TABLE IF NOT EXISTS products_fts USING fts5(
			name, category, specifications, manufacturer, notes,
			content=products, content_rowid=id
		);

		CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
			file_name, description,
			content=documents, content_rowid=id
		);
	`)
	return err
}

// checkSchema verifies the database schema is compatible with the current code.
// Returns an error if the schema is outdated and needs recreation.
func (a *App) checkSchema(ctx context.Context) error {
	// Check if sourcing_requests has the 'title' column (new schema)
	var colName string
	err := a.db.QueryRowContext(ctx,
		`SELECT name FROM pragma_table_info('sourcing_requests') WHERE name='title'`,
	).Scan(&colName)
	if err != nil {
		return fmt.Errorf("sourcing_requests missing 'title' column — old schema detected")
	}

	// Check if communications has the 'status' column
	err = a.db.QueryRowContext(ctx,
		`SELECT name FROM pragma_table_info('communications') WHERE name='status'`,
	).Scan(&colName)
	if err != nil {
		return fmt.Errorf("communications missing 'status' column — old schema detected")
	}

	return nil
}

// dropAllTables removes all tables so runMigrations can recreate them cleanly.
func (a *App) dropAllTables(ctx context.Context) {
	tables := []string{
		"documents_fts", "products_fts", "suppliers_fts",
		"activity_log", "communications", "documents",
		"purchase_order_line_items", "purchase_orders",
		"quotation_line_items", "quotations",
		"tender_suppliers", "tender_items", "tenders",
		"shortlist_suppliers", "supplier_shortlists",
		"pricing_history", "supplier_products",
		"product_suppliers", "sourcing_request_products",
		"sourcing_request_attachments", "sourcing_requests",
		"supplier_notes", "supplier_contacts",
		"customer_contacts", "customers",
		"products", "suppliers", "organizations", "users",
	}
	for _, t := range tables {
		a.db.ExecContext(ctx, "DROP TABLE IF EXISTS "+t)
	}
	log.Println("Dropped all tables for schema recreation")
}

func (a *App) GetVersion() string {
	return "1.0.0"
}

func (a *App) GetDataDir() string {
	dataDir, _ := os.UserConfigDir()
	return filepath.Join(dataDir, "ERP")
}
