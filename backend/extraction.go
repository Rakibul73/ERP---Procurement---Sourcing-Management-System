package main

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// ExtractionConfig holds the vision-LLM API configuration
type ExtractionConfig struct {
	Provider string `json:"provider"` // "openai", "gemini", "anthropic"
	APIKey   string `json:"apiKey"`
	Model    string `json:"model"`
}

// ExtractedData represents the structured data extracted from a document
type ExtractedData struct {
	Type        string                 `json:"type"` // "supplier", "product", "contact"
	Confidence  float64                `json:"confidence"`
	Data        map[string]interface{} `json:"data"`
	RawText     string                 `json:"rawText"`
	ExtractedAt time.Time              `json:"extractedAt"`
}

// ExtractionRequest represents a file upload for extraction
type ExtractionRequest struct {
	FileName string `json:"fileName"`
	FileData []byte `json:"fileData"`
	FileType string `json:"fileType"` // "image/jpeg", "image/png", etc.
}

// ExtractionResult represents the result of an extraction
type ExtractionResult struct {
	Success   bool           `json:"success"`
	Data      *ExtractedData `json:"data,omitempty"`
	Error     string         `json:"error,omitempty"`
	Provider  string         `json:"provider"`
	Model     string         `json:"model"`
}

// GetExtractionConfig returns the current extraction configuration
func (a *App) GetExtractionConfig() (*ExtractionConfig, error) {
	var config ExtractionConfig
	err := a.db.QueryRow(`
		SELECT provider, api_key, model
		FROM extraction_config
		ORDER BY id DESC
		LIMIT 1
	`).Scan(&config.Provider, &config.APIKey, &config.Model)

	if err != nil {
		// Return default config
		return &ExtractionConfig{
			Provider: "openai",
			Model:    "gpt-4o",
		}, nil
	}

	// Mask API key for display
	if len(config.APIKey) > 8 {
		config.APIKey = config.APIKey[:4] + "****" + config.APIKey[len(config.APIKey)-4:]
	}

	return &config, nil
}

// SaveExtractionConfig saves the extraction configuration
func (a *App) SaveExtractionConfig(provider, apiKey, model string) error {
	// Check if config exists
	var exists bool
	a.db.QueryRow("SELECT COUNT(*) > 0 FROM extraction_config").Scan(&exists)

	if exists {
		_, err := a.db.Exec(`
			UPDATE extraction_config
			SET provider = ?, api_key = ?, model = ?
			WHERE id = (SELECT id FROM extraction_config ORDER BY id DESC LIMIT 1)
		`, provider, apiKey, model)
		return err
	}

	_, err := a.db.Exec(`
		INSERT INTO extraction_config (provider, api_key, model)
		VALUES (?, ?, ?)
	`, provider, apiKey, model)
	return err
}

// ExtractFromImage extracts structured data from an image using vision-LLM
func (a *App) ExtractFromImage(req ExtractionRequest) (*ExtractionResult, error) {
	// Get extraction config
	config, err := a.GetExtractionConfig()
	if err != nil {
		return &ExtractionResult{
			Success: false,
			Error:   "Failed to load extraction config",
		}, nil
	}

	if config.APIKey == "" || config.APIKey == "****" {
		return &ExtractionResult{
			Success: false,
			Error:   "API key not configured. Please set up your vision-LLM API key in Settings.",
		}, nil
	}

	// Encode image to base64
	base64Image := base64.StdEncoding.EncodeToString(req.FileData)

	// Build prompt based on content type
	prompt := buildExtractionPrompt(req.FileType)

	// Call vision-LLM API
	var result *ExtractedResult
	switch config.Provider {
	case "openai":
		result, err = callOpenAIVision(config.APIKey, config.Model, base64Image, prompt)
	case "gemini":
		result, err = callGeminiVision(config.APIKey, config.Model, base64Image, prompt)
	case "anthropic":
		result, err = callAnthropicVision(config.APIKey, config.Model, base64Image, prompt)
	default:
		return &ExtractionResult{
			Success: false,
			Error:   fmt.Sprintf("Unsupported provider: %s", config.Provider),
		}, nil
	}

	if err != nil {
		return &ExtractionResult{
			Success:  false,
			Error:    err.Error(),
			Provider: config.Provider,
			Model:    config.Model,
		}, nil
	}

	return &ExtractionResult{
		Success:  true,
		Data:     result.Data,
		Provider: config.Provider,
		Model:    config.Model,
	}, nil
}

// buildExtractionPrompt creates the prompt for vision-LLM extraction
func buildExtractionPrompt(fileType string) string {
	return `Analyze this image and extract structured data. The image likely contains one of:
1. A business card or supplier information
2. A product catalog or specification sheet
3. A quotation or pricing document

Return a JSON object with the following structure:
{
  "type": "supplier|product|contact|quotation",
  "confidence": 0.0-1.0,
  "data": {
    // For supplier type:
    "companyName": "...",
    "country": "...",
    "address": "...",
    "website": "...",
    "email": "...",
    "phone": "...",
    "supplierType": "manufacturer|distributor|trader|agent",
    "contacts": [
      {
        "fullName": "...",
        "email": "...",
        "phone": "...",
        "position": "..."
      }
    ],
    // For product type:
    "name": "...",
    "category": "...",
    "specifications": "...",
    "gradeType": "...",
    "manufacturer": "...",
    "countryOfOrigin": "...",
    // For quotation type:
    "supplierName": "...",
    "items": [
      {
        "productName": "...",
        "quantity": 0,
        "unitPrice": 0,
        "currency": "USD",
        "moq": 0,
        "leadTimeDays": 0,
        "paymentTerms": "..."
      }
    ]
  },
  "rawText": "All text found in the image"
}

Extract as much information as possible. If a field is not found, use null.
Return ONLY valid JSON, no additional text or markdown formatting.`
}

// ExtractedResult is the internal result from API calls
type ExtractedResult struct {
	Data *ExtractedData
}

// callOpenAIVision calls OpenAI's GPT-4 Vision API
func callOpenAIVision(apiKey, model, base64Image, prompt string) (*ExtractedResult, error) {
	requestBody := map[string]interface{}{
		"model": model,
		"messages": []map[string]interface{}{
			{
				"role": "user",
				"content": []map[string]interface{}{
					{
						"type": "text",
						"text": prompt,
					},
					{
						"type": "image_url",
						"image_url": map[string]interface{}{
							"url": fmt.Sprintf("data:image/jpeg;base64,%s", base64Image),
						},
					},
				},
			},
		},
		"max_tokens": 4096,
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequest("POST", "https://api.openai.com/v1/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", apiKey))

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to call OpenAI API: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API error (%d): %s", resp.StatusCode, string(body))
	}

	var apiResponse struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}

	if err := json.Unmarshal(body, &apiResponse); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	if len(apiResponse.Choices) == 0 {
		return nil, fmt.Errorf("no response from API")
	}

	// Parse the JSON response from the LLM
	content := apiResponse.Choices[0].Message.Content
	return parseExtractedJSON(content)
}

// callGeminiVision calls Google's Gemini Vision API
func callGeminiVision(apiKey, model, base64Image, prompt string) (*ExtractedResult, error) {
	if model == "" {
		model = "gemini-pro-vision"
	}

	requestBody := map[string]interface{}{
		"contents": []map[string]interface{}{
			{
				"parts": []map[string]interface{}{
					{
						"text": prompt,
					},
					{
						"inline_data": map[string]interface{}{
							"mime_type": "image/jpeg",
							"data":      base64Image,
						},
					},
				},
			},
		},
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", model, apiKey)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to call Gemini API: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API error (%d): %s", resp.StatusCode, string(body))
	}

	var apiResponse struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}

	if err := json.Unmarshal(body, &apiResponse); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	if len(apiResponse.Candidates) == 0 || len(apiResponse.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("no response from API")
	}

	content := apiResponse.Candidates[0].Content.Parts[0].Text
	return parseExtractedJSON(content)
}

// callAnthropicVision calls Anthropic's Claude Vision API
func callAnthropicVision(apiKey, model, base64Image, prompt string) (*ExtractedResult, error) {
	if model == "" {
		model = "claude-3-opus-20240229"
	}

	requestBody := map[string]interface{}{
		"model": model,
		"max_tokens": 4096,
		"messages": []map[string]interface{}{
			{
				"role": "user",
				"content": []map[string]interface{}{
					{
						"type": "image",
						"source": map[string]interface{}{
							"type":       "base64",
							"media_type": "image/jpeg",
							"data":       base64Image,
						},
					},
					{
						"type": "text",
						"text": prompt,
					},
				},
			},
		},
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequest("POST", "https://api.anthropic.com/v1/messages", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to call Anthropic API: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API error (%d): %s", resp.StatusCode, string(body))
	}

	var apiResponse struct {
		Content []struct {
			Text string `json:"text"`
		} `json:"content"`
	}

	if err := json.Unmarshal(body, &apiResponse); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	if len(apiResponse.Content) == 0 {
		return nil, fmt.Errorf("no response from API")
	}

	content := apiResponse.Content[0].Text
	return parseExtractedJSON(content)
}

// parseExtractedJSON parses the JSON response from vision-LLM
func parseExtractedJSON(content string) (*ExtractedResult, error) {
	// Try to extract JSON from the response (might be wrapped in markdown)
	jsonStart := -1
	jsonEnd := -1

	for i, char := range content {
		if char == '{' && jsonStart == -1 {
			jsonStart = i
		}
		if char == '}' {
			jsonEnd = i
		}
	}

	if jsonStart == -1 || jsonEnd == -1 {
		return nil, fmt.Errorf("no JSON found in response")
	}

	jsonStr := content[jsonStart : jsonEnd+1]

	var extracted struct {
		Type       string                 `json:"type"`
		Confidence float64                `json:"confidence"`
		Data       map[string]interface{} `json:"data"`
		RawText    string                 `json:"rawText"`
	}

	if err := json.Unmarshal([]byte(jsonStr), &extracted); err != nil {
		return nil, fmt.Errorf("failed to parse extracted JSON: %w", err)
	}

	return &ExtractedResult{
		Data: &ExtractedData{
			Type:        extracted.Type,
			Confidence:  extracted.Confidence,
			Data:        extracted.Data,
			RawText:     extracted.RawText,
			ExtractedAt: time.Now(),
		},
	}, nil
}

// SaveExtractedData saves the extracted and confirmed data to the database
func (a *App) SaveExtractedData(dataType string, data map[string]interface{}) (int64, error) {
	switch dataType {
	case "supplier":
		return a.createSupplierFromExtracted(data)
	case "product":
		return a.createProductFromExtracted(data)
	default:
		return 0, fmt.Errorf("unsupported data type: %s", dataType)
	}
}

// createSupplierFromExtracted creates a supplier from extracted data
func (a *App) createSupplierFromExtracted(data map[string]interface{}) (int64, error) {
	result, err := a.db.Exec(`
		INSERT INTO suppliers (company_name, country, address, website, email, phone, supplier_type, notes)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`,
		getStringField(data, "companyName"),
		getStringField(data, "country"),
		getStringField(data, "address"),
		getStringField(data, "website"),
		getStringField(data, "email"),
		getStringField(data, "phone"),
		getStringField(data, "supplierType"),
		getStringField(data, "notes"),
	)
	if err != nil {
		return 0, err
	}

	supplierID, _ := result.LastInsertId()

	// Create contacts if present
	if contacts, ok := data["contacts"].([]interface{}); ok {
		for _, c := range contacts {
			if contact, ok := c.(map[string]interface{}); ok {
				a.db.Exec(`
					INSERT INTO supplier_contacts (supplier_id, full_name, email, phone, position)
					VALUES (?, ?, ?, ?, ?)
				`,
					supplierID,
					getStringField(contact, "fullName"),
					getStringField(contact, "email"),
					getStringField(contact, "phone"),
					getStringField(contact, "position"),
				)
			}
		}
	}

	return supplierID, nil
}

// createProductFromExtracted creates a product from extracted data
func (a *App) createProductFromExtracted(data map[string]interface{}) (int64, error) {
	result, err := a.db.Exec(`
		INSERT INTO products (name, category, specifications, grade_type, manufacturer, country_of_origin, notes)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`,
		getStringField(data, "name"),
		getStringField(data, "category"),
		getStringField(data, "specifications"),
		getStringField(data, "gradeType"),
		getStringField(data, "manufacturer"),
		getStringField(data, "countryOfOrigin"),
		getStringField(data, "notes"),
	)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

// getStringField safely extracts a string field from a map
func getStringField(data map[string]interface{}, key string) string {
	if val, ok := data[key]; ok {
		if str, ok := val.(string); ok {
			return str
		}
	}
	return ""
}
