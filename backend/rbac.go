package main

import "fmt"

// Role hierarchy: admin > procurement_manager > buyer > viewer
var roleHierarchy = map[string]int{
	"admin":               4,
	"procurement_manager": 3,
	"buyer":               2,
	"viewer":              1,
}

// Permission levels required for operations
var (
	PermReadOnly    = []string{"admin", "procurement_manager", "buyer", "viewer"}
	PermCreate      = []string{"admin", "procurement_manager", "buyer"}
	PermUpdate      = []string{"admin", "procurement_manager", "buyer"}
	PermDelete      = []string{"admin", "procurement_manager"}
	PermAdmin       = []string{"admin"}
	PermManageUsers = []string{"admin"}
	PermApprove     = []string{"admin", "procurement_manager"}
)

// RequireRole checks if the given role is in the allowed list.
func RequireRole(role string, allowed []string) error {
	for _, a := range allowed {
		if role == a {
			return nil
		}
	}
	return fmt.Errorf("forbidden: role %q not in %v", role, allowed)
}

// RequireMinRole checks if the user's role meets the minimum hierarchy level.
func RequireMinRole(role string, minLevel int) error {
	level, ok := roleHierarchy[role]
	if !ok || level < minLevel {
		return fmt.Errorf("forbidden: role %q requires minimum level %d", role, minLevel)
	}
	return nil
}

// GetCurrentUserRole fetches the role for a given user ID.
func (a *App) GetCurrentUserRole(userID int64) (string, error) {
	var role string
	err := a.db.QueryRowContext(a.ctx, "SELECT role FROM users WHERE id = ?", userID).Scan(&role)
	if err != nil {
		return "", fmt.Errorf("failed to get user role: %w", err)
	}
	return role, nil
}

// checkPermission verifies the current user has one of the allowed roles.
// Returns the current user and nil error if permitted, or ErrForbidden.
func (a *App) checkPermission(allowed []string) (*User, error) {
	if a.currentUser == nil {
		return nil, ErrUnauthorized
	}
	if err := RequireRole(a.currentUser.Role, allowed); err != nil {
		return nil, err
	}
	return a.currentUser, nil
}
