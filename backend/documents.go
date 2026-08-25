package main

import (
	"fmt"
)

type Document struct {
	ID          int64  `json:"id"`
	EntityType  string `json:"entityType"`
	EntityID    int64  `json:"entityId"`
	FileName    string `json:"fileName"`
	FilePath    string `json:"filePath"`
	FileType    string `json:"fileType"`
	Description string `json:"description"`
	UploadedBy  *int64 `json:"uploadedBy"`
	CreatedAt   string `json:"createdAt"`
}

func (a *App) GetDocuments() ([]Document, error) {
	rows, err := a.db.Query(`
		SELECT d.id, d.entity_type, d.entity_id, d.file_name, d.file_path,
			COALESCE(d.file_type,''), COALESCE(d.description,''),
			d.uploaded_by, d.created_at
		FROM documents d
		ORDER BY d.created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var docs []Document
	for rows.Next() {
		var doc Document
		if err := rows.Scan(&doc.ID, &doc.EntityType, &doc.EntityID,
			&doc.FileName, &doc.FilePath, &doc.FileType, &doc.Description,
			&doc.UploadedBy, &doc.CreatedAt); err != nil {
			return nil, err
		}
		docs = append(docs, doc)
	}
	return docs, nil
}

func (a *App) GetDocumentsByEntity(entityType string, entityID int64) ([]Document, error) {
	rows, err := a.db.Query(`
		SELECT d.id, d.entity_type, d.entity_id, d.file_name, d.file_path,
			COALESCE(d.file_type,''), COALESCE(d.description,''),
			d.uploaded_by, d.created_at
		FROM documents d
		WHERE d.entity_type = ? AND d.entity_id = ?
		ORDER BY d.created_at DESC
	`, entityType, entityID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var docs []Document
	for rows.Next() {
		var doc Document
		if err := rows.Scan(&doc.ID, &doc.EntityType, &doc.EntityID,
			&doc.FileName, &doc.FilePath, &doc.FileType, &doc.Description,
			&doc.UploadedBy, &doc.CreatedAt); err != nil {
			return nil, err
		}
		docs = append(docs, doc)
	}
	return docs, nil
}

func (a *App) CreateDocument(doc Document) (int64, error) {
	if _, err := a.checkPermission(PermCreate); err != nil {
		return 0, err
	}
	result, err := a.db.Exec(`
		INSERT INTO documents (entity_type, entity_id, file_name, file_path, file_type, description, uploaded_by)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, doc.EntityType, doc.EntityID, doc.FileName, doc.FilePath, doc.FileType, doc.Description, doc.UploadedBy)
	if err != nil {
		return 0, err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return 0, err
	}
	a.LogActivity(doc.UploadedBy, "create", "document", &id,
		fmt.Sprintf("Uploaded document: %s", doc.FileName))
	return id, nil
}

func (a *App) DeleteDocument(id int64) error {
	if _, err := a.checkPermission(PermDelete); err != nil {
		return err
	}
	_, err := a.db.Exec("DELETE FROM documents WHERE id=?", id)
	if err != nil {
		return err
	}
	a.LogActivity(nil, "delete", "document", &id, "Deleted document")
	return nil
}
