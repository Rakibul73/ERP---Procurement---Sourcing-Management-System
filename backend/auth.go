package main

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"log"
	"time"

	"golang.org/x/crypto/argon2"
)

type User struct {
	ID           int64  `json:"id"`
	Username     string `json:"username"`
	Email        string `json:"email"`
	FullName     string `json:"fullName"`
	Role         string `json:"role"`
	Active       bool   `json:"active"`
	CreatedAt    string `json:"createdAt"`
	UpdatedAt    string `json:"updatedAt"`
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

type RegisterRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
	FullName string `json:"fullName"`
}

type Organization struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	Address   string `json:"address"`
	Phone     string `json:"phone"`
	Email     string `json:"email"`
	Website   string `json:"website"`
	LogoPath  string `json:"logoPath"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
}

type ActivityLogEntry struct {
	ID         int64  `json:"id"`
	UserID     *int64 `json:"userId"`
	Action     string `json:"action"`
	EntityType string `json:"entityType"`
	EntityID   *int64 `json:"entityId"`
	Details    string `json:"details"`
	CreatedAt  string `json:"createdAt"`
}

func hashPassword(password string) string {
	salt := make([]byte, 16)
	rand.Read(salt)
	hash := argon2.IDKey([]byte(password), salt, 1, 64*1024, 4, 32)
	return hex.EncodeToString(salt) + ":" + hex.EncodeToString(hash)
}

func verifyPassword(password, encoded string) bool {
	parts := split(encoded, ":")
	if len(parts) != 2 {
		return false
	}
	salt, _ := hex.DecodeString(parts[0])
	hash := argon2.IDKey([]byte(password), salt, 1, 64*1024, 4, 32)
	return hex.EncodeToString(hash) == parts[1]
}

func split(s, sep string) []string {
	var result []string
	for {
		i := indexOf(s, sep)
		if i < 0 {
			break
		}
		result = append(result, s[:i])
		s = s[i+len(sep):]
	}
	result = append(result, s)
	return result
}

func indexOf(s, sub string) int {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return i
		}
	}
	return -1
}

func generateToken() string {
	b := make([]byte, 32)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func (a *App) Login(req LoginRequest) (*LoginResponse, error) {
	var user User
	var passwordHash string

	err := a.db.QueryRowContext(a.ctx,
		"SELECT id, username, email, full_name, role, active, password_hash, created_at, updated_at FROM users WHERE username = ?",
		req.Username,
	).Scan(&user.ID, &user.Username, &user.Email, &user.FullName, &user.Role, &user.Active, &passwordHash, &user.CreatedAt, &user.UpdatedAt)

	if err == sql.ErrNoRows {
		return nil, ErrInvalidCredentials
	}
	if err != nil {
		return nil, err
	}

	if !user.Active {
		return nil, ErrAccountDisabled
	}

	if !verifyPassword(req.Password, passwordHash) {
		return nil, ErrInvalidCredentials
	}

	token := generateToken()

	_, err = a.db.ExecContext(a.ctx,
		"INSERT INTO activity_log (user_id, action, entity_type, entity_id, details) VALUES (?, 'login', 'user', ?, 'User logged in')",
		user.ID, user.ID,
	)
	if err != nil {
		log.Printf("Failed to log activity: %v", err)
	}

	a.currentUser = &user

	return &LoginResponse{
		Token: token,
		User:  user,
	}, nil
}

// GetCurrentSession returns the currently logged-in user.
func (a *App) GetCurrentSession() (*User, error) {
	if a.currentUser == nil {
		return nil, ErrUnauthorized
	}
	return a.currentUser, nil
}

// Logout clears the current session.
func (a *App) Logout() {
	a.currentUser = nil
}

func (a *App) Register(req RegisterRequest) (*User, error) {
	if a.currentUser != nil {
		if _, err := a.checkPermission(PermManageUsers); err != nil {
			return nil, err
		}
	}
	var exists int
	err := a.db.QueryRowContext(a.ctx, "SELECT COUNT(*) FROM users WHERE username = ? OR email = ?", req.Username, req.Email).Scan(&exists)
	if err != nil {
		return nil, err
	}
	if exists > 0 {
		return nil, ErrUserExists
	}

	passwordHash := hashPassword(req.Password)

	result, err := a.db.ExecContext(a.ctx,
		"INSERT INTO users (username, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, 'user')",
		req.Username, req.Email, passwordHash, req.FullName,
	)
	if err != nil {
		return nil, err
	}

	id, _ := result.LastInsertId()

	_, err = a.db.ExecContext(a.ctx,
		"INSERT INTO activity_log (user_id, action, entity_type, entity_id, details) VALUES (?, 'register', 'user', ?, 'New user registered')",
		id, id,
	)
	if err != nil {
		log.Printf("Failed to log activity: %v", err)
	}

	return &User{
		ID:        id,
		Username:  req.Username,
		Email:     req.Email,
		FullName:  req.FullName,
		Role:      "user",
		Active:    true,
		CreatedAt: time.Now().Format(time.RFC3339),
		UpdatedAt: time.Now().Format(time.RFC3339),
	}, nil
}

func (a *App) GetUsers() ([]User, error) {
	rows, err := a.db.QueryContext(a.ctx,
		"SELECT id, username, email, full_name, role, active, created_at, updated_at FROM users ORDER BY created_at DESC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []User
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.Username, &u.Email, &u.FullName, &u.Role, &u.Active, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, nil
}

func (a *App) GetUser(id int64) (*User, error) {
	var u User
	err := a.db.QueryRowContext(a.ctx,
		"SELECT id, username, email, full_name, role, active, created_at, updated_at FROM users WHERE id = ?", id,
	).Scan(&u.ID, &u.Username, &u.Email, &u.FullName, &u.Role, &u.Active, &u.CreatedAt, &u.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	return &u, err
}

func (a *App) UpdateUser(id int64, fullName, email, role string, active bool) error {
	if _, err := a.checkPermission(PermManageUsers); err != nil {
		return err
	}
	result, err := a.db.ExecContext(a.ctx,
		"UPDATE users SET full_name = ?, email = ?, role = ?, active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
		fullName, email, role, active, id,
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

func (a *App) DeleteUser(id int64) error {
	if _, err := a.checkPermission(PermManageUsers); err != nil {
		return err
	}
	result, err := a.db.ExecContext(a.ctx, "DELETE FROM users WHERE id = ?", id)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}

func (a *App) GetOrganization() (*Organization, error) {
	var org Organization
	err := a.db.QueryRowContext(a.ctx,
		"SELECT id, name, address, phone, email, website, logo_path, created_at, updated_at FROM organizations LIMIT 1",
	).Scan(&org.ID, &org.Name, &org.Address, &org.Phone, &org.Email, &org.Website, &org.LogoPath, &org.CreatedAt, &org.UpdatedAt)
	if err == sql.ErrNoRows {
		return &Organization{}, nil
	}
	return &org, err
}

func (a *App) SaveOrganization(name, address, phone, email, website string) (*Organization, error) {
	var org Organization
	err := a.db.QueryRowContext(a.ctx, "SELECT id FROM organizations LIMIT 1").Scan(&org.ID)

	if err == sql.ErrNoRows {
		result, err := a.db.ExecContext(a.ctx,
			"INSERT INTO organizations (name, address, phone, email, website) VALUES (?, ?, ?, ?, ?)",
			name, address, phone, email, website,
		)
		if err != nil {
			return nil, err
		}
		id, _ := result.LastInsertId()
		org.ID = id
	} else if err != nil {
		return nil, err
	} else {
		_, err = a.db.ExecContext(a.ctx,
			"UPDATE organizations SET name = ?, address = ?, phone = ?, email = ?, website = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
			name, address, phone, email, website, org.ID,
		)
		if err != nil {
			return nil, err
		}
	}

	return a.GetOrganization()
}

func (a *App) GetActivityLog(limit int) ([]ActivityLogEntry, error) {
	if limit <= 0 {
		limit = 50
	}
	rows, err := a.db.QueryContext(a.ctx,
		"SELECT id, user_id, action, entity_type, entity_id, details, created_at FROM activity_log ORDER BY created_at DESC LIMIT ?", limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []ActivityLogEntry
	for rows.Next() {
		var e ActivityLogEntry
		if err := rows.Scan(&e.ID, &e.UserID, &e.Action, &e.EntityType, &e.EntityID, &e.Details, &e.CreatedAt); err != nil {
			return nil, err
		}
		entries = append(entries, e)
	}
	return entries, nil
}

func (a *App) LogActivity(userID *int64, action, entityType string, entityID *int64, details string) {
	_, err := a.db.ExecContext(a.ctx,
		"INSERT INTO activity_log (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)",
		userID, action, entityType, entityID, details,
	)
	if err != nil {
		log.Printf("Failed to log activity: %v", err)
	}
}

var (
	ErrInvalidCredentials = &AppError{Code: "INVALID_CREDENTIALS", Message: "Invalid username or password"}
	ErrAccountDisabled    = &AppError{Code: "ACCOUNT_DISABLED", Message: "Account is disabled"}
	ErrUserExists         = &AppError{Code: "USER_EXISTS", Message: "Username or email already exists"}
	ErrNotFound           = &AppError{Code: "NOT_FOUND", Message: "Resource not found"}
	ErrUnauthorized       = &AppError{Code: "UNAUTHORIZED", Message: "Unauthorized"}
)

type AppError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func (e *AppError) Error() string {
	return e.Message
}
