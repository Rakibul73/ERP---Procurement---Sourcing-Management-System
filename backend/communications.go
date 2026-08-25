package main

import (
	"fmt"
	"time"
)

type Communication struct {
	ID           int64     `json:"id"`
	EntityType   string    `json:"entityType"`
	EntityID     int64     `json:"entityId"`
	Direction    string    `json:"direction"`
	Channel      string    `json:"channel"`
	Subject      string    `json:"subject"`
	Content      string    `json:"content"`
	ContactName  string    `json:"contactName"`
	ContactEmail string    `json:"contactEmail"`
	ContactPhone string    `json:"contactPhone"`
	Attachments  string    `json:"attachments"`
	CreatedBy    *int64    `json:"createdBy"`
	CreatedByName string   `json:"createdByName"`
	CreatedAt    time.Time `json:"createdAt"`
}

func (a *App) GetAllCommunications() ([]Communication, error) {
	query := `
		SELECT c.id, c.entity_type, c.entity_id, c.direction, c.channel,
			COALESCE(c.subject,''), COALESCE(c.content,''),
			COALESCE(c.contact_name,''), COALESCE(c.contact_email,''), COALESCE(c.contact_phone,''),
			COALESCE(c.attachments,''), c.created_by, COALESCE(u.full_name,''), c.created_at
		FROM communications c
		LEFT JOIN users u ON c.created_by = u.id
		ORDER BY c.created_at DESC
	`
	rows, err := a.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var comms []Communication
	for rows.Next() {
		var comm Communication
		err := rows.Scan(&comm.ID, &comm.EntityType, &comm.EntityID, &comm.Direction,
			&comm.Channel, &comm.Subject, &comm.Content, &comm.ContactName,
			&comm.ContactEmail, &comm.ContactPhone, &comm.Attachments,
			&comm.CreatedBy, &comm.CreatedByName, &comm.CreatedAt)
		if err != nil {
			return nil, err
		}
		comms = append(comms, comm)
	}
	return comms, nil
}

func (a *App) GetCommunications(entityType string, entityID int64) ([]Communication, error) {
	query := `
		SELECT c.id, c.entity_type, c.entity_id, c.direction, c.channel,
			COALESCE(c.subject,''), COALESCE(c.content,''),
			COALESCE(c.contact_name,''), COALESCE(c.contact_email,''), COALESCE(c.contact_phone,''),
			COALESCE(c.attachments,''), c.created_by, COALESCE(u.full_name,''), c.created_at
		FROM communications c
		LEFT JOIN users u ON c.created_by = u.id
		WHERE c.entity_type = ? AND c.entity_id = ?
		ORDER BY c.created_at DESC
	`
	rows, err := a.db.Query(query, entityType, entityID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var comms []Communication
	for rows.Next() {
		var comm Communication
		err := rows.Scan(&comm.ID, &comm.EntityType, &comm.EntityID, &comm.Direction,
			&comm.Channel, &comm.Subject, &comm.Content, &comm.ContactName,
			&comm.ContactEmail, &comm.ContactPhone, &comm.Attachments,
			&comm.CreatedBy, &comm.CreatedByName, &comm.CreatedAt)
		if err != nil {
			return nil, err
		}
		comms = append(comms, comm)
	}
	return comms, nil
}

func (a *App) CreateCommunication(comm Communication) (int64, error) {
	result, err := a.db.Exec(`
		INSERT INTO communications (entity_type, entity_id, direction, channel, subject, content,
			contact_name, contact_email, contact_phone, attachments, created_by)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, comm.EntityType, comm.EntityID, comm.Direction, comm.Channel,
		comm.Subject, comm.Content, comm.ContactName, comm.ContactEmail,
		comm.ContactPhone, comm.Attachments, comm.CreatedBy)
	if err != nil {
		return 0, err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return 0, err
	}
	a.LogActivity(comm.CreatedBy, "create", "communication", &id,
		fmt.Sprintf("Added %s communication: %s", comm.Channel, comm.Subject))
	return id, nil
}

func (a *App) DeleteCommunication(id int64) error {
	_, err := a.db.Exec("DELETE FROM communications WHERE id=?", id)
	if err != nil {
		return err
	}
	a.LogActivity(nil, "delete", "communication", &id, "Deleted communication")
	return nil
}
