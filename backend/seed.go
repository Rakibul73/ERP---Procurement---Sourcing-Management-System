package main

import (
	"fmt"
	"log"
	"time"
)

func (a *App) SeedDatabase() error {
	var count int
	if err := a.db.QueryRow("SELECT COUNT(*) FROM suppliers").Scan(&count); err != nil {
		return fmt.Errorf("failed to check supplier count: %w", err)
	}
	if count > 0 {
		log.Printf("Seed skipped: %d suppliers already exist", count)
		return nil
	}

	tx, err := a.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Helper to exec and check errors
	execOrRollback := func(query string, args ...interface{}) error {
		if _, err := tx.Exec(query, args...); err != nil {
			log.Printf("Seed INSERT failed: %v\n  Query: %s", err, query)
			return fmt.Errorf("seed exec failed: %w", err)
		}
		return nil
	}

	// === USERS ===
	var userCount int
	if err := a.db.QueryRow("SELECT COUNT(*) FROM users").Scan(&userCount); err == nil && userCount == 0 {
		pw := hashPassword("admin123")
		users := []struct{ username, email, fullName, role string }{
			{"admin", "admin@erp-demo.com", "System Administrator", "admin"},
			{"sarah.chen", "sarah@erp-demo.com", "Sarah Chen", "procurement_manager"},
			{"mike.jones", "mike@erp-demo.com", "Mike Jones", "buyer"},
			{"lisa.wong", "lisa@erp-demo.com", "Lisa Wong", "viewer"},
		}
		for _, u := range users {
			if err := execOrRollback(`INSERT INTO users (username, email, password_hash, full_name, role, active) VALUES (?, ?, ?, ?, ?, 1)`,
				u.username, u.email, pw, u.fullName, u.role); err != nil {
				return err
			}
		}
	}

	// === ORGANIZATION ===
	var orgCount int
	if err := a.db.QueryRow("SELECT COUNT(*) FROM organizations").Scan(&orgCount); err == nil && orgCount == 0 {
		if err := execOrRollback(`INSERT INTO organizations (name, address, phone, email, website) VALUES (?, ?, ?, ?, ?)`,
			"Global Procurement Corp", "123 Business Ave, Suite 500, New York, NY 10001",
			"+1-212-555-0100", "info@globalprocurement.com", "https://globalprocurement.com"); err != nil {
			return err
		}
	}

	// === SUPPLIERS ===
	suppliers := []struct {
		name, country, address, email, phone, website, supplierType, notes string
	}{
		{"Shenzhen TechParts Co.", "China", "Futian District, Shenzhen, Guangdong 518000", "sales@sztechparts.cn", "+86-755-8888-9999", "https://sztechparts.cn", "manufacturer", "Primary electronics supplier. MOQ 500 units. ISO 9001:2015 certified. Average lead time 14 days."},
		{"Mumbai Textiles Ltd.", "India", "45 MG Road, Mumbai, Maharashtra 400001", "export@mumbaitextiles.in", "+91-22-2345-6789", "https://mumbaitextiles.in", "manufacturer", "High-quality cotton and synthetic fabrics. 30-day lead time. Exported to 40+ countries."},
		{"Bavarian Precision GmbH", "Germany", "Industriestr. 12, 80331 Munich, Bavaria", "sales@bavarian-precision.de", "+49-89-1234-5678", "https://bavarian-precision.de", "manufacturer", "CNC machined components. ISO 9001:2015 certified. Tolerances down to +/-0.01mm."},
		{"Sao Paulo Plastics S.A.", "Brazil", "Rua Industrial 456, Sao Paulo, SP 01310-100", "vendas@spplastics.com.br", "+55-11-3456-7890", "https://spplastics.com.br", "manufacturer", "Injection molded parts. Tooling in-house. Capacity: 50,000 units/month."},
		{"Tokyo Components KK", "Japan", "2-1-3 Akihabara, Chiyoda-ku, Tokyo 101-0021", "info@tokyocomponents.co.jp", "+81-3-5678-9012", "https://tokyocomponents.co.jp", "distributor", "Premium capacitors and resistors. Small batch OK. Authorized distributor for Murata, TDK."},
		{"Istanbul Ceramics", "Turkey", "Organize Sanayi Bolgesi, Istanbul 34000", "export@istanbulceramics.com.tr", "+90-212-9876-5432", "https://istanbulceramics.com.tr", "manufacturer", "Decorative and industrial ceramics. Export to Europe and Middle East."},
		{"Bangkok Rubber Co.", "Thailand", "199 Sukhumvit Rd, Bangkok 10110", "sales@bkkrubber.co.th", "+66-2-1234-5678", "https://bkkrubber.co.th", "manufacturer", "Custom rubber seals and gaskets. Fast turnaround. FDA and food-grade certified."},
		{"Dongguan Hardware Ltd.", "China", "Chang'an Town, Dongguan, Guangdong 523000", "orders@dghardware.cn", "+86-769-2222-3333", "https://dghardware.cn", "wholesaler", "Fasteners, bolts, screws. Bulk pricing available. 10,000+ SKUs in stock."},
		{"Milan Fashion Supplies", "Italy", "Via Torino 78, 20123 Milan, Lombardy", "info@milanfashionsupplies.it", "+39-02-8765-4321", "https://milanfashionsupplies.it", "distributor", "Premium packaging and labels. Minimum order 1000. Custom printing available."},
		{"Seoul Semiconductor", "South Korea", "264 Palpan-daero, Jongno-gu, Seoul 03154", "sales@seoulsemi.co.kr", "+82-2-3456-7890", "https://seoulsemi.co.kr", "manufacturer", "LED modules and drivers. 2-year warranty. ISO 14001 certified."},
		{"Vietnam Wood Products JSC", "Vietnam", "Lot C-12, Long Hau IP, Long An 85000", "export@vnwood.vn", "+84-72-3456-7890", "https://vnwood.vn", "manufacturer", "Sustainable hardwood furniture and components. FSC certified."},
		{"Shanghai Steel Trading Co.", "China", "Pudong New Area, Shanghai 200120", "sales@shanghaisteel.cn", "+86-21-6688-7777", "https://shanghaisteel.cn", "wholesaler", "Steel coils, sheets, and plates. Full range of grades. Bulk discounts."},
	}
	for _, s := range suppliers {
		if err := execOrRollback(`INSERT INTO suppliers (company_name, country, address, email, phone, website, supplier_type, notes, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
			s.name, s.country, s.address, s.email, s.phone, s.website, s.supplierType, s.notes); err != nil {
			return err
		}
	}

	// === SUPPLIER CONTACTS ===
	contacts := []struct {
		supplierID                           int
		fullName, email, phone, position     string
		isPrimary                            int
	}{
		{1, "Li Wei", "li.wei@sztechparts.cn", "+86-138-0000-1111", "Sales Manager", 1},
		{1, "Zhang Min", "zhang.min@sztechparts.cn", "+86-138-0000-2222", "Export Dept.", 0},
		{2, "Rajesh Patel", "rajesh@mumbaitextiles.in", "+91-98-7654-3210", "Director", 1},
		{2, "Priya Sharma", "priya@mumbaitextiles.in", "+91-98-7654-3211", "Sales Exec", 0},
		{3, "Hans Mueller", "hans@bavarian-precision.de", "+49-170-1234567", "Vertriebsleiter", 1},
		{4, "Carlos Silva", "carlos@spplastics.com.br", "+55-11-99887-6655", "Comercial", 1},
		{5, "Tanaka Yuki", "tanaka@tokyocomponents.co.jp", "+81-90-1234-5678", "Sales", 1},
		{5, "Sato Kenji", "sato@tokyocomponents.co.jp", "+81-90-1234-5679", "Account Manager", 0},
		{6, "Mehmet Kaya", "mehmet@istanbulceramics.com.tr", "+90-532-123-4567", "Export Manager", 1},
		{7, "Somchai Prasert", "somchai@bkkrubber.co.th", "+66-81-234-5678", "Sales Exec", 1},
		{8, "Wang Jian", "wang.jian@dghardware.cn", "+86-135-0000-3333", "Sales Director", 1},
		{8, "Liu Fang", "liu.fang@dghardware.cn", "+86-135-0000-4444", "Export Manager", 0},
		{9, "Giovanni Rossi", "giovanni@milanfashionsupplies.it", "+39-333-1234567", "Export Manager", 1},
		{10, "Park Jimin", "park@seoulsemi.co.kr", "+82-10-1234-5678", "Sales Rep", 1},
		{11, "Nguyen Thanh", "nguyen@vnwood.vn", "+84-912-345-678", "Export Director", 1},
		{12, "Chen Dawei", "chen@shanghaisteel.cn", "+86-139-0000-5555", "Sales Manager", 1},
	}
	for _, c := range contacts {
		if err := execOrRollback(`INSERT INTO supplier_contacts (supplier_id, full_name, email, phone, position, is_primary) VALUES (?, ?, ?, ?, ?, ?)`,
			c.supplierID, c.fullName, c.email, c.phone, c.position, c.isPrimary); err != nil {
			return err
		}
	}

	// === PRODUCTS ===
	products := []struct {
		name, category, specs, gradeType, manufacturer, countryOfOrigin string
	}{
		{"Arduino Uno R3 Microcontroller", "Electronics", "ATmega328P, 14 digital I/O, 6 analog inputs, 16MHz, USB-B", "Standard", "Arduino", "Italy"},
		{"Cotton Twill Fabric 280gsm", "Textiles", "100% cotton, 280gsm, width 150cm, natural color, pre-shrunk", "A-Grade", "Mumbai Textiles", "India"},
		{"Stainless Steel M6 Bolt DIN 933", "Hardware", "M6x20mm, A2-70 stainless steel, hex head, DIN 933 standard", "Standard", "Dongguan Hardware", "China"},
		{"Silicone Rubber Gasket 2mm", "Rubber", "VMQ silicone, 2mm thickness, -60C to +200C, FDA food grade", "Food Grade", "Bangkok Rubber", "Thailand"},
		{"LED Module 3W RGB", "Electronics", "3W RGB LED, 12V DC, CREE chips, 120-deg beam angle, IP65", "Premium", "Seoul Semiconductor", "South Korea"},
		{"ABS Injection Molded Housing", "Plastics", "ABS plastic, UV stabilized, custom color, IP65 rated", "Standard", "Sao Paulo Plastics", "Brazil"},
		{"Ceramic Tile 300x300mm", "Ceramics", "Porcelain, 300x300x8mm, matte finish, R10 slip rating", "Grade A", "Istanbul Ceramics", "Turkey"},
		{"CNC Aluminum Bracket 6061", "Metalwork", "6061-T6 aluminum, CNC machined, anodized black, +/-0.05mm", "Standard", "Bavarian Precision", "Germany"},
		{"Polyester Packaging Ribbon", "Packaging", "Polyester satin, 25mm width, custom printing available", "Standard", "Milan Fashion Supplies", "Italy"},
		{"Tantalum Capacitor 100uF 16V", "Electronics", "100uF 16V, Case B, ESR 0.1ohm, -55C to +125C, MIL-spec", "Military", "Tokyo Components", "Japan"},
		{"Walnut Dining Table", "Furniture", "Solid walnut, 180x90x75cm, seats 6, oil finish", "Premium", "Vietnam Wood Products", "Vietnam"},
		{"Hot-Rolled Steel Coil", "Raw Materials", "Q235B grade, 3mm thickness, 1250mm width, 6m length", "Standard", "Shanghai Steel Trading", "China"},
		{"USB-C to USB-A Cable", "Electronics", "2m, USB 3.1 Gen 2, 10Gbps, 100W PD charging, braided", "Standard", "Shenzhen TechParts", "China"},
		{"Polypropylene Sheet 2mm", "Plastics", "PP homopolymer, 2mm thick, 1000x2000mm, natural white", "Standard", "Sao Paulo Plastics", "Brazil"},
		{"Copper Wire 1.5mm sq", "Raw Materials", "C11000 ETP copper, 1.5mm sq, 100m spool, annealed", "Standard", "Shanghai Steel Trading", "China"},
	}
	for _, p := range products {
		if err := execOrRollback(`INSERT INTO products (name, category, specifications, grade_type, manufacturer, country_of_origin) VALUES (?, ?, ?, ?, ?, ?)`,
			p.name, p.category, p.specs, p.gradeType, p.manufacturer, p.countryOfOrigin); err != nil {
			return err
		}
	}

	// === SUPPLIER-PRODUCT LINKS (with pricing) ===
	supplierProducts := []struct {
		supplierID, productID int
		unitPrice             float64
		currency, moq         string
		leadTimeDays          int
		paymentTerms, notes   string
	}{
		{1, 1, 12.50, "USD", "500", 14, "Net 30", "Bulk discount above 5000 units"},
		{1, 5, 3.80, "USD", "1000", 20, "Net 30", "Minimum 1000 pieces per order"},
		{1, 13, 2.10, "USD", "2000", 10, "Net 30", "Available in black and white"},
		{2, 2, 4.20, "USD", "500m", 30, "Net 45", "Samples available on request"},
		{3, 8, 18.50, "EUR", "100", 21, "Net 30", "Custom tooling extra EUR500"},
		{4, 6, 2.10, "USD", "1000", 25, "Net 30", "Includes standard color matching"},
		{4, 14, 1.80, "USD", "2000", 20, "Net 30", "Custom sizes available"},
		{5, 10, 0.45, "USD", "5000", 10, "Net 30", "Tape & reel packaging"},
		{6, 7, 8.90, "EUR", "200sqm", 30, "Net 45", "Custom patterns available"},
		{7, 4, 0.85, "USD", "500", 14, "Net 30", "Custom sizes available"},
		{8, 3, 0.08, "USD", "10000", 5, "Net 15", "Standard hex packaging"},
		{9, 9, 1.20, "EUR", "1000", 15, "Net 30", "Custom printing MOQ 5000"},
		{10, 5, 3.95, "USD", "500", 14, "Net 30", "Genuine CREE chips"},
		{11, 11, 185.00, "USD", "10", 45, "Net 60", "FSC certified wood"},
		{12, 12, 680.00, "USD", "25 tons", 14, "Net 30", "Price per ton, FOB Shanghai"},
		{12, 15, 4.50, "USD", "1000m", 7, "Net 15", "Price per meter"},
	}
	for _, sp := range supplierProducts {
		if err := execOrRollback(`INSERT INTO supplier_products (supplier_id, product_id, unit_price, currency, moq, lead_time_days, payment_terms, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			sp.supplierID, sp.productID, sp.unitPrice, sp.currency, sp.moq, sp.leadTimeDays, sp.paymentTerms, sp.notes); err != nil {
			return err
		}
	}

	// === PRICING HISTORY ===
	now := time.Now()
	pricingHistory := []struct {
		supplierProductID int
		price             float64
		currency          string
		daysAgo           int
		notes             string
	}{
		{1, 13.50, "USD", 180, "Original quote price"},
		{1, 13.00, "USD", 120, "Negotiated 4% discount"},
		{1, 12.50, "USD", 60, "Volume discount applied"},
		{3, 2.50, "USD", 120, "Initial pricing"},
		{3, 2.10, "USD", 30, "Current negotiated price"},
		{5, 22.00, "EUR", 90, "First quote"},
		{5, 18.50, "EUR", 30, "Final negotiated price"},
		{7, 2.40, "USD", 180, "Old pricing"},
		{7, 2.10, "USD", 60, "Current pricing"},
	}
	for _, ph := range pricingHistory {
		ts := now.Add(-time.Duration(ph.daysAgo) * 24 * time.Hour)
		if err := execOrRollback(`INSERT INTO pricing_history (supplier_product_id, price, currency, effective_date, notes) VALUES (?, ?, ?, ?, ?)`,
			ph.supplierProductID, ph.price, ph.currency, ts.Format("2006-01-02"), ph.notes); err != nil {
			return err
		}
	}

	// === CUSTOMERS ===
	customers := []struct {
		name, email, phone, address, website string
	}{
		{"BuildRight Construction", "orders@buildright.com", "+1-555-100-2000", "456 Builder St, Dallas, TX 75201", "https://buildright.com"},
		{"TechFlow Manufacturing", "procurement@techflow.com", "+1-555-200-3000", "789 Industrial Blvd, Austin, TX 78701", "https://techflow.com"},
		{"GreenLeaf Organics", "buy@greenleaf.com", "+1-555-300-4000", "321 Farm Road, Portland, OR 97201", "https://greenleaf.com"},
		{"Metro Retail Group", "supply@metroretail.com", "+1-555-400-5000", "555 Commerce Ave, Chicago, IL 60601", "https://metroretail.com"},
		{"Pacific Electronics Inc.", "parts@pacificelec.com", "+1-555-500-6000", "888 Tech Dr, San Jose, CA 95101", "https://pacificelec.com"},
		{"Nordic Design Studio", "hello@nordicdesign.se", "+46-8-123-4567", "Storgatan 15, 111 51 Stockholm, Sweden", "https://nordicdesign.se"},
		{"Gulf Construction LLC", "info@gulfconstruction.ae", "+971-4-333-4444", "Sheikh Zayed Rd, Dubai, UAE", "https://gulfconstruction.ae"},
	}
	for _, c := range customers {
		if err := execOrRollback(`INSERT INTO customers (company_name, email, phone, address, website, active) VALUES (?, ?, ?, ?, ?, 1)`,
			c.name, c.email, c.phone, c.address, c.website); err != nil {
			return err
		}
	}

	// === CUSTOMER CONTACTS ===
	custContacts := []struct {
		customerID                        int
		fullName, email, phone, position  string
		isPrimary                         int
	}{
		{1, "Tom Builder", "tom@buildright.com", "+1-555-100-2001", "Procurement Manager", 1},
		{2, "Jane Flow", "jane@techflow.com", "+1-555-200-3001", "VP Operations", 1},
		{2, "Bob Chen", "bob@techflow.com", "+1-555-200-3002", "Buyer", 0},
		{3, "Alice Green", "alice@greenleaf.com", "+1-555-300-4001", "Owner", 1},
		{4, "Mark Metro", "mark@metroretail.com", "+1-555-400-5001", "Supply Chain Dir.", 1},
		{5, "Eve Pacific", "eve@pacificelec.com", "+1-555-500-6001", "Purchasing Agent", 1},
		{6, "Lars Svensson", "lars@nordicdesign.se", "+46-70-123-4567", "Design Director", 1},
		{7, "Ahmed Al-Rashid", "ahmed@gulfconstruction.ae", "+971-50-333-4444", "Project Manager", 1},
	}
	for _, c := range custContacts {
		if err := execOrRollback(`INSERT INTO customer_contacts (customer_id, full_name, email, phone, position, is_primary) VALUES (?, ?, ?, ?, ?, ?)`,
			c.customerID, c.fullName, c.email, c.phone, c.position, c.isPrimary); err != nil {
			return err
		}
	}

	// === SOURCING REQUESTS (schema: title, description, priority, target_date, budget, currency, status) ===
	sourcingRequests := []struct {
		title, description, priority, status, currency string
		budget                                          float64
		daysAgo, targetDays                             int
	}{
		{"Q3 Electronics Components", "Need MIL-PRF-55365 qualified tantalum capacitors for military-grade assemblies. Annual volume 100K+ units.", "high", "open", "USD", 50000, 30, 60},
		{"Office Furniture Refresh", "Solid walnut furniture for new executive offices. Must be FSC certified. 6 dining tables plus matching chairs.", "medium", "open", "USD", 10000, 25, 90},
		{"Packaging Materials 2026", "Annual polyester ribbon supply contract. Quarterly deliveries of 12,500 units each. Custom printing required.", "medium", "in_progress", "USD", 60000, 60, 120},
		{"CNC Parts Prototype Run", "Prototype batch of 6061-T6 aluminum brackets. Tight tolerances +/-0.05mm. Anodized black finish.", "high", "open", "EUR", 2000, 15, 30},
		{"Textile Sample Collection", "Spring 2027 collection samples. 20 colorways of cotton twill at 280gsm. 10 meters per colorway.", "low", "completed", "USD", 1000, 90, 45},
		{"LED Module Bulk Order", "3W RGB LED modules with CREE chips. IP65 rated. Looking for IP67 options as well.", "high", "open", "USD", 40000, 10, 45},
		{"Steel Supply Contract", "Monthly hot-rolled steel coil deliveries. 12-month contract. Q235B grade, 3mm thickness.", "medium", "draft", "USD", 80000, 5, 30},
	}
	for _, sr := range sourcingRequests {
		ts := now.Add(-time.Duration(sr.daysAgo) * 24 * time.Hour)
		targetDate := now.Add(time.Duration(sr.targetDays) * 24 * time.Hour)
		if err := execOrRollback(`INSERT INTO sourcing_requests (title, description, priority, target_date, budget, currency, status, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
			sr.title, sr.description, sr.priority, targetDate.Format("2006-01-02"), sr.budget, sr.currency, sr.status, ts.Format("2006-01-02 15:04:05"), ts.Format("2006-01-02 15:04:05")); err != nil {
			return err
		}
	}

	// === TENDERS ===
	tenders := []struct {
		title, status, notes, deadline string
		daysAgo                        int
	}{
		{"Capacitor Supply 2026-2027", "sent", "Annual supply of tantalum capacitors. 100,000 units over 12 months.", "2026-09-15", 20},
		{"Aluminum Bracket Production", "draft", "CNC machined brackets. 500 units/month for 6 months.", "2026-10-01", 10},
		{"Fabric Supply Contract", "closed", "Cotton and polyester fabric supply for 2027 production.", "2026-07-31", 45},
		{"LED Module Annual Contract", "sent", "3W RGB LED modules. 10,000 units quarterly.", "2026-09-30", 5},
		{"Steel Coil Supply", "draft", "Hot-rolled steel coils. Monthly delivery, 12-month term.", "2026-10-15", 3},
	}
	for _, t := range tenders {
		ts := now.Add(-time.Duration(t.daysAgo) * 24 * time.Hour)
		if err := execOrRollback(`INSERT INTO tenders (title, status, notes, deadline, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)`,
			t.title, t.status, t.notes, t.deadline, ts.Format("2006-01-02 15:04:05"), ts.Format("2006-01-02 15:04:05")); err != nil {
			return err
		}
	}

	// === TENDER ITEMS ===
	tenderItems := []struct {
		tenderID                            int
		productName, specs, unit            string
		quantity                            int
	}{
		{1, "Tantalum Capacitor 100uF 16V", "100uF 16V, Case B, ESR 0.1ohm, MIL-spec", "pcs", 100000},
		{1, "Tantalum Capacitor 47uF 25V", "47uF 25V, Case B, ESR 0.15ohm, MIL-spec", "pcs", 50000},
		{2, "CNC Aluminum Bracket 6061", "6061-T6, +/-0.05mm, anodized black", "pcs", 500},
		{3, "Cotton Twill Fabric 280gsm", "100% cotton, 280gsm, 150cm width", "meters", 10000},
		{3, "Polyester Blend Fabric", "65/35 poly-cotton, 200gsm, 150cm", "meters", 8000},
		{4, "LED Module 3W RGB", "3W RGB, 12V, CREE chips, IP65", "pcs", 10000},
		{5, "Hot-Rolled Steel Coil Q235B", "3mm, 1250mm width, 6m length", "tons", 25},
		{5, "Cold-Rolled Steel Sheet", "1mm, 1000mm width, 2m length", "sheets", 500},
	}
	for _, ti := range tenderItems {
		if err := execOrRollback(`INSERT INTO tender_items (tender_id, product_name, specifications, quantity, unit) VALUES (?, ?, ?, ?, ?)`,
			ti.tenderID, ti.productName, ti.specs, ti.quantity, ti.unit); err != nil {
			return err
		}
	}

	// === TENDER SUPPLIERS ===
	tenderSuppliers := []struct {
		tenderID, supplierID int
		status               string
	}{
		{1, 5, "invited"},
		{1, 10, "responded"},
		{1, 1, "invited"},
		{2, 3, "invited"},
		{3, 2, "responded"},
		{4, 10, "invited"},
		{4, 1, "invited"},
		{5, 12, "invited"},
	}
	for _, ts := range tenderSuppliers {
		if err := execOrRollback(`INSERT INTO tender_suppliers (tender_id, supplier_id, status) VALUES (?, ?, ?)`,
			ts.tenderID, ts.supplierID, ts.status); err != nil {
			return err
		}
	}

	// === QUOTATIONS ===
	type qData struct {
		tenderID, supplierID, daysAgo int
		title, status, currency      string
		validityDate                 string
		shippingTerms, paymentTerms  string
		leadTimeDays                 int
		notes                        string
	}
	quotations := []qData{
		{1, 5, 15, "Capacitor Quote - Tokyo Components", "received", "USD", "2026-10-15", "FOB Tokyo", "Net 30", 10, "Competitive pricing. Can handle 100K units."},
		{1, 10, 12, "Capacitor Quote - Seoul Semi", "received", "USD", "2026-10-20", "CIF New York", "Net 45", 14, "MIL-qualified. Higher price but guaranteed quality."},
		{1, 1, 10, "Capacitor Quote - Shenzhen TechParts", "received", "USD", "2026-10-10", "FOB Shenzhen", "Net 30", 12, "Best price. Standard quality, not MIL-spec."},
		{3, 2, 30, "Fabric Quote - Mumbai Textiles", "accepted", "USD", "2026-08-30", "CIF Portland", "Net 45", 25, "Excellent quality cotton. Custom dyeing available."},
		{4, 10, 5, "LED Quote - Seoul Semiconductor", "received", "USD", "2026-10-05", "FOB Seoul", "Net 30", 14, "Premium CREE chips. 2-year warranty."},
		{4, 1, 4, "LED Quote - Shenzhen TechParts", "received", "USD", "2026-10-08", "FOB Shenzhen", "Net 30", 10, "Lower price, Chinese-made chips."},
	}
	for _, q := range quotations {
		ts := now.Add(-time.Duration(q.daysAgo) * 24 * time.Hour)
		if err := execOrRollback(`INSERT INTO quotations (tender_id, supplier_id, title, status, currency, validity_date, shipping_terms, payment_terms, lead_time_days, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			q.tenderID, q.supplierID, q.title, q.status, q.currency, q.validityDate, q.shippingTerms, q.paymentTerms, q.leadTimeDays, q.notes, ts.Format("2006-01-02 15:04:05"), ts.Format("2006-01-02 15:04:05")); err != nil {
			return err
		}
	}

	// === QUOTATION LINE ITEMS ===
	qLineItems := []struct {
		quotationID                                         int
		productName, specs, notes                           string
		quantity                                            int
		unitPrice, moq                                      float64
		leadTimeDays                                        int
	}{
		{1, "Tantalum Capacitor 100uF 16V", "100uF 16V, Case B, MIL-spec", "Price breaks at 25K, 50K, 100K", 100000, 0.44, 5000, 10},
		{1, "Tantalum Capacitor 47uF 25V", "47uF 25V, Case B, MIL-spec", "Same series as above", 50000, 0.52, 5000, 10},
		{2, "Tantalum Capacitor 100uF 16V", "100uF 16V, Case B, MIL-spec", "MIL-PRF-55365 qualified", 100000, 0.48, 10000, 14},
		{2, "Tantalum Capacitor 47uF 25V", "47uF 25V, Case B, MIL-spec", "Same series", 50000, 0.55, 10000, 14},
		{3, "Tantalum Capacitor 100uF 16V", "100uF 16V, Case B", "Non-MIL, standard grade", 100000, 0.38, 1000, 12},
		{3, "Tantalum Capacitor 47uF 25V", "47uF 25V, Case B", "Non-MIL, standard grade", 50000, 0.45, 1000, 12},
		{4, "Cotton Twill Fabric 280gsm", "100% cotton, 280gsm, 150cm", "Includes free samples", 10000, 4.10, 500, 25},
		{4, "Polyester Blend Fabric", "65/35, 200gsm, 150cm", "Custom dyeing MOQ 2000m", 8000, 3.20, 500, 20},
		{5, "LED Module 3W RGB", "3W RGB, 12V, CREE, IP65", "Premium CREE chips", 10000, 3.75, 1000, 14},
		{6, "LED Module 3W RGB", "3W RGB, 12V, Chinese chips", "Lower cost alternative", 10000, 2.80, 500, 10},
	}
	for _, li := range qLineItems {
		if err := execOrRollback(`INSERT INTO quotation_line_items (quotation_id, product_name, specifications, quantity, unit_price, moq, lead_time_days, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			li.quotationID, li.productName, li.specs, li.quantity, li.unitPrice, li.moq, li.leadTimeDays, li.notes); err != nil {
			return err
		}
	}

	// === PURCHASE ORDERS ===
	type poData struct {
		poNumber, status, currency, paymentTerms, shippingTerms, deliveryAddress, notes string
		supplierID                                                                     int
		totalAmount                                                                    float64
		daysAgo                                                                        int
		expectedDays                                                                   int
	}
	pos := []poData{
		{"PO-2026-001", "delivered", "USD", "Net 30", "FOB Shenzhen", "123 Business Ave, New York, NY 10001", "Arduino boards for Q2 production", 1, 6250.00, 60, 14},
		{"PO-2026-002", "confirmed", "USD", "Net 45", "CIF Portland", "321 Farm Road, Portland, OR 97201", "Cotton fabric for GreenLeaf order", 2, 21000.00, 30, 25},
		{"PO-2026-003", "sent", "USD", "Net 30", "FOB Dongguan", "123 Business Ave, New York, NY 10001", "Bulk bolts for hardware inventory", 8, 800.00, 10, 5},
		{"PO-2026-004", "approved", "USD", "Net 30", "FOB Seoul", "888 Tech Dr, San Jose, CA 95101", "LED modules for Pacific Electronics", 10, 37500.00, 7, 14},
		{"PO-2026-005", "draft", "EUR", "Net 30", "EXW Munich", "Industriestr. 12, 80331 Munich", "Prototype brackets for R&D", 3, 1850.00, 2, 21},
		{"PO-2026-006", "delivered", "USD", "Net 30", "FOB Shenzhen", "123 Business Ave, New York, NY 10001", "USB-C cables restocking", 1, 2100.00, 45, 10},
		{"PO-2026-007", "confirmed", "USD", "Net 45", "FOB Istanbul", "555 Commerce Ave, Chicago, IL 60601", "Ceramic tiles for Metro Retail", 6, 4450.00, 20, 30},
	}
	for _, po := range pos {
		orderDate := now.Add(-time.Duration(po.daysAgo) * 24 * time.Hour)
		expDate := orderDate.Add(time.Duration(po.expectedDays) * 24 * time.Hour)
		if err := execOrRollback(`INSERT INTO purchase_orders (po_number, supplier_id, status, total_amount, currency, order_date, expected_delivery, payment_terms, shipping_terms, delivery_address, notes, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
			po.poNumber, po.supplierID, po.status, po.totalAmount, po.currency, orderDate.Format("2006-01-02"), expDate.Format("2006-01-02"), po.paymentTerms, po.shippingTerms, po.deliveryAddress, po.notes, orderDate.Format("2006-01-02 15:04:05"), orderDate.Format("2006-01-02 15:04:05")); err != nil {
			return err
		}
	}

	// === PURCHASE ORDER LINE ITEMS ===
	poLineItems := []struct {
		poID                          int
		productName, specs, notes     string
		quantity                      int
		unitPrice, totalPrice         float64
	}{
		{1, "Arduino Uno R3 Microcontroller", "ATmega328P, 14 digital I/O", "500 units @ $12.50", 500, 12.50, 6250.00},
		{2, "Cotton Twill Fabric 280gsm", "100% cotton, 280gsm, 150cm", "5000m @ $4.20/m", 5000, 4.20, 21000.00},
		{3, "Stainless Steel M6 Bolt DIN 933", "M6x20mm, A2-70 stainless", "10000 pcs @ $0.08", 10000, 0.08, 800.00},
		{4, "LED Module 3W RGB", "3W RGB, 12V, CREE, IP65", "10000 pcs @ $3.75", 10000, 3.75, 37500.00},
		{5, "CNC Aluminum Bracket 6061", "6061-T6, +/-0.05mm, anodized", "100 pcs @ $18.50", 100, 18.50, 1850.00},
		{6, "USB-C to USB-A Cable", "2m, USB 3.1, 100W PD, braided", "1000 pcs @ $2.10", 1000, 2.10, 2100.00},
		{7, "Ceramic Tile 300x300mm", "Porcelain, 300x300x8mm, R10", "500 sqm @ $8.90/sqm", 500, 8.90, 4450.00},
	}
	for _, li := range poLineItems {
		if err := execOrRollback(`INSERT INTO purchase_order_line_items (purchase_order_id, product_name, specifications, quantity, unit_price, total_price, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
			li.poID, li.productName, li.specs, li.quantity, li.unitPrice, li.totalPrice, li.notes); err != nil {
			return err
		}
	}

	// === COMMUNICATIONS ===
	type commData struct {
		entityType, entityID, direction, channel, subject, contactName, content, status string
		daysAgo                                                                        int
	}
	comms := []commData{
		{"supplier", "1", "outbound", "email", "RFQ for LED Modules", "Li Wei", "Sent request for 5000 LED modules with specifications attached. Please provide pricing and lead time.", "sent", 360},
		{"supplier", "1", "inbound", "email", "RE: RFQ for LED Modules", "Li Wei", "Received quote. Price $3.80/unit. Lead time 14 days. MOQ 1000 pieces.", "received", 340},
		{"supplier", "3", "outbound", "phone", "Quality inquiry", "Hans Mueller", "Called about ISO certificate renewal. Confirmed valid through 2027. Will send updated cert via email.", "completed", 720},
		{"supplier", "3", "inbound", "email", "ISO Certificate Updated", "Hans Mueller", "Attached renewed ISO 9001:2015 certificate. Valid until Dec 2027.", "received", 700},
		{"supplier", "5", "outbound", "email", "Capacitor Supply Tender", "Tanaka Yuki", "Invited to participate in capacitor supply tender. Documents attached.", "sent", 360},
		{"supplier", "10", "outbound", "email", "Capacitor Supply Tender", "Park Jimin", "Invited to participate in capacitor supply tender. Specifications attached.", "sent", 340},
		{"supplier", "10", "inbound", "email", "RE: Capacitor Supply Tender", "Park Jimin", "Quotation submitted. MIL-qualified capacitors. Premium pricing but guaranteed quality.", "received", 288},
		{"supplier", "2", "outbound", "email", "Fabric Supply Contract", "Rajesh Patel", "Annual fabric supply contract for 2027. Need pricing for cotton and polyester blends.", "sent", 600},
		{"supplier", "2", "inbound", "email", "RE: Fabric Supply Contract", "Rajesh Patel", "Submitted quotation. $4.10/m cotton, $3.20/m polyester. Lead time 25 days.", "received", 580},
		{"customer", "1", "outbound", "email", "Order Confirmation PO-2026-001", "Tom Builder", "Order confirmed. Delivery scheduled for Sept 1. Tracking number will be sent.", "sent", 1080},
		{"customer", "2", "inbound", "email", "Order Inquiry", "Jane Flow", "Need 200 additional LED modules for Q3. Can you expedite?", "received", 200},
		{"customer", "2", "outbound", "email", "RE: Order Inquiry", "Jane Flow", "Expedited order confirmed. Will ship within 7 days. Extra $0.50/unit surcharge.", "sent", 180},
		{"customer", "5", "outbound", "email", "PO-2026-004 Confirmation", "Eve Pacific", "LED module order confirmed. 10,000 units. Expected delivery in 14 days.", "sent", 160},
		{"customer", "7", "outbound", "phone", "Project kickoff call", "Ahmed Al-Rashid", "Discussed Q1 2027 furniture requirements. Will send detailed specs next week.", "completed", 48},
		{"supplier", "7", "outbound", "email", "Rubber Gasket Samples", "Somchai Prasert", "Requested samples for silicone gaskets. 3 sizes: 1mm, 2mm, 3mm.", "sent", 120},
		{"supplier", "7", "inbound", "email", "RE: Rubber Gasket Samples", "Somchai Prasert", "Samples shipped via DHL. Tracking: DHL1234567890. Arriving in 5 days.", "received", 100},
		{"supplier", "8", "outbound", "email", "Bulk Bolt Pricing", "Wang Jian", "Requesting volume discount for 50,000+ M6 bolts per month.", "sent", 72},
		{"customer", "4", "inbound", "email", "Restocking Request", "Mark Metro", "Need 200 ceramic tiles, 300x300mm. Same specification as PO-2026-007.", "received", 48},
	}
	for _, c := range comms {
		ts := now.Add(-time.Duration(c.daysAgo) * 24 * time.Hour)
		if err := execOrRollback(`INSERT INTO communications (entity_type, entity_id, direction, channel, subject, contact_name, content, status, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
			c.entityType, c.entityID, c.direction, c.channel, c.subject, c.contactName, c.content, c.status, ts.Format("2006-01-02 15:04:05")); err != nil {
			return err
		}
	}

	// === ACTIVITY LOG ===
	type activity struct {
		action, entityType, details string
		hoursAgo                    int
	}
	activities := []activity{
		{"create", "sourcing_request", "Created sourcing request: Q3 Electronics Components", 720},
		{"create", "sourcing_request", "Created sourcing request: Office Furniture Refresh", 600},
		{"create", "sourcing_request", "Created sourcing request: Packaging Materials 2026", 1440},
		{"update", "sourcing_request", "Status changed to in_progress: Packaging Materials 2026", 720},
		{"create", "sourcing_request", "Created sourcing request: CNC Parts Prototype Run", 360},
		{"create", "sourcing_request", "Created sourcing request: Textile Sample Collection", 2160},
		{"create", "sourcing_request", "Created sourcing request: LED Module Bulk Order", 240},
		{"create", "sourcing_request", "Created sourcing request: Steel Supply Contract", 120},
		{"create", "tender", "Created tender: Capacitor Supply 2026-2027", 480},
		{"update", "tender", "Status changed to sent: Capacitor Supply 2026-2027", 360},
		{"create", "tender", "Created tender: Aluminum Bracket Production", 240},
		{"create", "tender", "Created tender: Fabric Supply Contract", 1080},
		{"update", "tender", "Status changed to closed: Fabric Supply Contract", 720},
		{"create", "tender", "Created tender: LED Module Annual Contract", 120},
		{"create", "tender", "Created tender: Steel Supply Contract", 72},
		{"create", "quotation", "Received quotation from Tokyo Components KK", 360},
		{"create", "quotation", "Received quotation from Seoul Semiconductor", 288},
		{"create", "quotation", "Received quotation from Shenzhen TechParts", 240},
		{"update", "quotation", "Quotation accepted: Fabric Quote - Mumbai Textiles", 480},
		{"create", "quotation", "Received quotation from Seoul Semiconductor (LED)", 120},
		{"create", "quotation", "Received quotation from Shenzhen TechParts (LED)", 96},
		{"create", "purchase_order", "Created PO-2026-001 for Shenzhen TechParts Co.", 1440},
		{"update", "purchase_order", "PO-2026-001 status changed to confirmed", 1080},
		{"update", "purchase_order", "PO-2026-001 status changed to delivered", 720},
		{"create", "purchase_order", "Created PO-2026-002 for Mumbai Textiles Ltd.", 720},
		{"update", "purchase_order", "PO-2026-002 status changed to confirmed", 480},
		{"create", "purchase_order", "Created PO-2026-003 for Dongguan Hardware Ltd.", 240},
		{"create", "purchase_order", "Created PO-2026-004 for Seoul Semiconductor", 168},
		{"create", "purchase_order", "Created PO-2026-005 for Bavarian Precision GmbH", 48},
		{"create", "purchase_order", "Created PO-2026-006 for Shenzhen TechParts Co.", 1080},
		{"update", "purchase_order", "PO-2026-006 status changed to delivered", 720},
		{"create", "purchase_order", "Created PO-2026-007 for Istanbul Ceramics", 480},
		{"create", "customer", "Added customer: BuildRight Construction", 1440},
		{"create", "customer", "Added customer: TechFlow Manufacturing", 1080},
		{"create", "customer", "Added customer: GreenLeaf Organics", 720},
		{"create", "customer", "Added customer: Metro Retail Group", 360},
		{"create", "customer", "Added customer: Pacific Electronics Inc.", 240},
		{"create", "customer", "Added customer: Nordic Design Studio", 120},
		{"create", "customer", "Added customer: Gulf Construction LLC", 48},
		{"create", "communication", "Email sent to Li Wei re: LED module RFQ", 360},
		{"create", "communication", "Email received from Park Jimin re: Capacitor Tender", 288},
		{"create", "communication", "Email sent to Tom Builder re: PO-2026-001", 1080},
		{"create", "communication", "Phone call with Hans Mueller re: ISO cert", 720},
		{"create", "communication", "Email sent to Somchai re: Rubber gasket samples", 120},
	}
	for _, act := range activities {
		ts := now.Add(-time.Duration(act.hoursAgo) * time.Hour)
		if err := execOrRollback(`INSERT INTO activity_log (user_id, action, entity_type, details, created_at) VALUES (1, ?, ?, ?, ?)`,
			act.action, act.entityType, act.details, ts.Format("2006-01-02 15:04:05")); err != nil {
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	log.Println("Database seeded successfully with demo data")
	return nil
}

func (a *App) maybeSeed() {
	var count int
	if err := a.db.QueryRow("SELECT COUNT(*) FROM suppliers").Scan(&count); err != nil {
		log.Printf("maybeSeed: failed to check supplier count: %v", err)
		return
	}
	if count == 0 {
		log.Println("Empty or unseeded database detected -- seeding demo data...")
		if err := a.SeedDatabase(); err != nil {
			log.Printf("Seed failed: %v", err)
			return
		}
		// Verify seed succeeded
		var supplierCount, productCount, poCount, customerCount int
		a.db.QueryRow("SELECT COUNT(*) FROM suppliers").Scan(&supplierCount)
		a.db.QueryRow("SELECT COUNT(*) FROM products").Scan(&productCount)
		a.db.QueryRow("SELECT COUNT(*) FROM purchase_orders").Scan(&poCount)
		a.db.QueryRow("SELECT COUNT(*) FROM customers").Scan(&customerCount)
		log.Printf("Seed verification: suppliers=%d products=%d purchase_orders=%d customers=%d", supplierCount, productCount, poCount, customerCount)
	}
}

// DeleteSeedData removes all demo data except users and organization
func (a *App) DeleteSeedData() error {
	tables := []string{
		"activity_log",
		"communications",
		"purchase_order_line_items",
		"purchase_orders",
		"quotation_line_items",
		"quotations",
		"tender_suppliers",
		"tender_items",
		"tenders",
		"supplier_shortlists",
		"shortlist_suppliers",
		"shortlists",
		"sourcing_request_attachments",
		"sourcing_request_products",
		"sourcing_requests",
		"pricing_history",
		"supplier_products",
		"supplier_documents",
		"supplier_notes",
		"supplier_contacts",
		"customer_requirements",
		"customer_contacts",
		"customers",
		"documents",
		"import_job_errors",
		"import_jobs",
		"products",
		"suppliers",
		"extraction_config",
	}
	for _, table := range tables {
		a.db.Exec("DELETE FROM " + table)
	}
	log.Println("Seed data deleted (users and organization preserved)")
	return nil
}
