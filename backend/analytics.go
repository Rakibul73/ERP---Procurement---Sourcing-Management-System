package main

import "log"

type DashboardStats struct {
	TotalSuppliers   int     `json:"totalSuppliers"`
	ActiveSuppliers  int     `json:"activeSuppliers"`
	TotalProducts    int     `json:"totalProducts"`
	TotalCustomers   int     `json:"totalCustomers"`
	PendingPOs       int     `json:"pendingPOs"`
	TotalPOValue     float64 `json:"totalPOValue"`
	DraftPOs         int     `json:"draftPOs"`
	ApprovedPOs      int     `json:"approvedPOs"`
	SentPOs          int     `json:"sentPOs"`
	ConfirmedPOs     int     `json:"confirmedPOs"`
	DeliveredPOs     int     `json:"deliveredPOs"`
	OpenSourcing     int     `json:"openSourcing"`
	OpenTenders      int     `json:"openTenders"`
	ReceivedQuots    int     `json:"receivedQuotations"`
}

type SpendingBySupplier struct {
	SupplierName string  `json:"supplierName"`
	TotalSpend   float64 `json:"totalSpend"`
	POCount      int     `json:"poCount"`
}

type MonthlySpend struct {
	Month  string  `json:"month"`
	Amount float64 `json:"amount"`
}

type TenderPerformance struct {
	TenderTitle string  `json:"tenderTitle"`
	QuoteCount  int     `json:"quoteCount"`
	Status      string  `json:"status"`
	LowestQuote float64 `json:"lowestQuote"`
	AvgQuote    float64 `json:"avgQuote"`
}

type OnTimeDelivery struct {
	Month        string  `json:"month"`
	OnTimeCount  int     `json:"onTimeCount"`
	LateCount    int     `json:"lateCount"`
	OnTimeRate   float64 `json:"onTimeRate"`
}

func (a *App) GetDashboardStats() (DashboardStats, error) {
	var stats DashboardStats

	if err := a.db.QueryRow("SELECT COUNT(*) FROM suppliers").Scan(&stats.TotalSuppliers); err != nil {
		log.Printf("Dashboard stats error (TotalSuppliers): %v", err)
	}
	if err := a.db.QueryRow("SELECT COUNT(*) FROM suppliers WHERE active=1").Scan(&stats.ActiveSuppliers); err != nil {
		log.Printf("Dashboard stats error (ActiveSuppliers): %v", err)
	}
	if err := a.db.QueryRow("SELECT COUNT(*) FROM products").Scan(&stats.TotalProducts); err != nil {
		log.Printf("Dashboard stats error (TotalProducts): %v", err)
	}
	if err := a.db.QueryRow("SELECT COUNT(*) FROM customers").Scan(&stats.TotalCustomers); err != nil {
		log.Printf("Dashboard stats error (TotalCustomers): %v", err)
	}
	if err := a.db.QueryRow("SELECT COUNT(*) FROM purchase_orders WHERE status NOT IN ('cancelled','delivered')").Scan(&stats.PendingPOs); err != nil {
		log.Printf("Dashboard stats error (PendingPOs): %v", err)
	}
	if err := a.db.QueryRow("SELECT COALESCE(SUM(total_amount),0) FROM purchase_orders WHERE status NOT IN ('cancelled')").Scan(&stats.TotalPOValue); err != nil {
		log.Printf("Dashboard stats error (TotalPOValue): %v", err)
	}
	if err := a.db.QueryRow("SELECT COUNT(*) FROM purchase_orders WHERE status='draft'").Scan(&stats.DraftPOs); err != nil {
		log.Printf("Dashboard stats error (DraftPOs): %v", err)
	}
	if err := a.db.QueryRow("SELECT COUNT(*) FROM purchase_orders WHERE status='approved'").Scan(&stats.ApprovedPOs); err != nil {
		log.Printf("Dashboard stats error (ApprovedPOs): %v", err)
	}
	if err := a.db.QueryRow("SELECT COUNT(*) FROM purchase_orders WHERE status='sent'").Scan(&stats.SentPOs); err != nil {
		log.Printf("Dashboard stats error (SentPOs): %v", err)
	}
	if err := a.db.QueryRow("SELECT COUNT(*) FROM purchase_orders WHERE status='confirmed'").Scan(&stats.ConfirmedPOs); err != nil {
		log.Printf("Dashboard stats error (ConfirmedPOs): %v", err)
	}
	if err := a.db.QueryRow("SELECT COUNT(*) FROM purchase_orders WHERE status='delivered'").Scan(&stats.DeliveredPOs); err != nil {
		log.Printf("Dashboard stats error (DeliveredPOs): %v", err)
	}
	if err := a.db.QueryRow("SELECT COUNT(*) FROM sourcing_requests WHERE status IN ('open','in_progress')").Scan(&stats.OpenSourcing); err != nil {
		log.Printf("Dashboard stats error (OpenSourcing): %v", err)
	}
	if err := a.db.QueryRow("SELECT COUNT(*) FROM tenders WHERE status IN ('draft','sent')").Scan(&stats.OpenTenders); err != nil {
		log.Printf("Dashboard stats error (OpenTenders): %v", err)
	}
	if err := a.db.QueryRow("SELECT COUNT(*) FROM quotations WHERE status='received'").Scan(&stats.ReceivedQuots); err != nil {
		log.Printf("Dashboard stats error (ReceivedQuots): %v", err)
	}

	log.Printf("Dashboard stats: suppliers=%d products=%d customers=%d pendingPOs=%d openSourcing=%d openTenders=%d receivedQuots=%d",
		stats.TotalSuppliers, stats.TotalProducts, stats.TotalCustomers, stats.PendingPOs, stats.OpenSourcing, stats.OpenTenders, stats.ReceivedQuots)

	return stats, nil
}

func (a *App) GetSpendingBySupplier() ([]SpendingBySupplier, error) {
	rows, err := a.db.Query(`
		SELECT s.company_name, COALESCE(SUM(po.total_amount),0), COUNT(po.id)
		FROM suppliers s
		LEFT JOIN purchase_orders po ON s.id = po.supplier_id AND po.status != 'cancelled'
		GROUP BY s.id
		HAVING COALESCE(SUM(po.total_amount), 0) > 0
		ORDER BY SUM(po.total_amount) DESC
		LIMIT 10
	`)
	if err != nil {
		log.Printf("GetSpendingBySupplier error: %v", err)
		return nil, err
	}
	defer rows.Close()

	var results []SpendingBySupplier
	for rows.Next() {
		var r SpendingBySupplier
		if err := rows.Scan(&r.SupplierName, &r.TotalSpend, &r.POCount); err != nil {
			log.Printf("GetSpendingBySupplier scan error: %v", err)
			return nil, err
		}
		results = append(results, r)
	}
	return results, nil
}

func (a *App) GetMonthlySpend() ([]MonthlySpend, error) {
	rows, err := a.db.Query(`
		SELECT strftime('%Y-%m', order_date) as month, COALESCE(SUM(total_amount), 0)
		FROM purchase_orders
		WHERE status != 'cancelled' AND order_date IS NOT NULL AND order_date != ''
		GROUP BY month
		ORDER BY month DESC
		LIMIT 12
	`)
	if err != nil {
		log.Printf("GetMonthlySpend error: %v", err)
		return nil, err
	}
	defer rows.Close()

	var results []MonthlySpend
	for rows.Next() {
		var r MonthlySpend
		if err := rows.Scan(&r.Month, &r.Amount); err != nil {
			log.Printf("GetMonthlySpend scan error: %v", err)
			return nil, err
		}
		results = append(results, r)
	}

	// Reverse so oldest first
	for i, j := 0, len(results)-1; i < j; i, j = i+1, j-1 {
		results[i], results[j] = results[j], results[i]
	}

	return results, nil
}

func (a *App) GetTenderPerformance() ([]TenderPerformance, error) {
	rows, err := a.db.Query(`
		WITH q_totals AS (
			SELECT q.id as quotation_id, q.tender_id, COALESCE(SUM(qli.unit_price * qli.quantity), 0) as total_amount
			FROM quotations q
			LEFT JOIN quotation_line_items qli ON q.id = qli.quotation_id
			WHERE q.tender_id IS NOT NULL
			GROUP BY q.id
		)
		SELECT t.title,
			COUNT(qt.quotation_id) as quote_count,
			t.status,
			COALESCE(MIN(qt.total_amount), 0) as lowest_quote,
			COALESCE(AVG(qt.total_amount), 0) as avg_quote
		FROM tenders t
		JOIN q_totals qt ON t.id = qt.tender_id
		GROUP BY t.id
		HAVING COUNT(qt.quotation_id) > 0
		ORDER BY t.created_at DESC
		LIMIT 10
	`)
	if err != nil {
		log.Printf("GetTenderPerformance error: %v", err)
		return nil, err
	}
	defer rows.Close()

	var results []TenderPerformance
	for rows.Next() {
		var r TenderPerformance
		if err := rows.Scan(&r.TenderTitle, &r.QuoteCount, &r.Status, &r.LowestQuote, &r.AvgQuote); err != nil {
			log.Printf("GetTenderPerformance scan error: %v", err)
			return nil, err
		}
		results = append(results, r)
	}
	return results, nil
}

func (a *App) GetOnTimeDeliveryRate() ([]OnTimeDelivery, error) {
	rows, err := a.db.Query(`
		SELECT strftime('%Y-%m', order_date) as month,
			COALESCE(SUM(CASE WHEN actual_delivery <= expected_delivery THEN 1 ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN actual_delivery > expected_delivery THEN 1 ELSE 0 END), 0)
		FROM purchase_orders
		WHERE status = 'delivered' AND expected_delivery IS NOT NULL AND actual_delivery IS NOT NULL
		GROUP BY month
		ORDER BY month DESC
		LIMIT 12
	`)
	if err != nil {
		log.Printf("GetOnTimeDeliveryRate error: %v", err)
		return nil, err
	}
	defer rows.Close()

	var results []OnTimeDelivery
	for rows.Next() {
		var r OnTimeDelivery
		if err := rows.Scan(&r.Month, &r.OnTimeCount, &r.LateCount); err != nil {
			log.Printf("GetOnTimeDeliveryRate scan error: %v", err)
			return nil, err
		}
		total := r.OnTimeCount + r.LateCount
		if total > 0 {
			r.OnTimeRate = float64(r.OnTimeCount) / float64(total) * 100
		}
		results = append(results, r)
	}

	for i, j := 0, len(results)-1; i < j; i, j = i+1, j-1 {
		results[i], results[j] = results[j], results[i]
	}

	return results, nil
}

