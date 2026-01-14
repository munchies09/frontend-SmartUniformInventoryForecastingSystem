# Backend Forecast Run Endpoint - Implementation Guide

## Overview

The forecasting system has been redesigned to be **user-friendly**. Users no longer upload JSON files. Instead, they click a "Forecast Uniform Demand" button, and the backend automatically generates recommendations using a pre-trained ML model.

## System Architecture

```
Historical Data (DB)
        ↓
 Pre-trained ML Model (.pkl)
        ↓
 Prediction Service (Backend)
        ↓
 Recommended Stock (DB)
        ↓
 Forecasting Dashboard (Frontend)
```

## New Endpoint Required

### `POST /api/forecast/run`

**Purpose:** Generate forecast recommendations using pre-trained ML model and historical data.

**Authentication:** Admin only (Bearer token required)

**Request:**
```http
POST /api/forecast/run
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:** None (empty body)

**Response (Success - 200 OK):**
```json
{
  "success": true,
  "message": "Forecast generated successfully",
  "generated": 50
}
```

**Response (Error - 500):**
```json
{
  "success": false,
  "message": "Failed to generate forecast: <error details>",
  "error": "Model not found or historical data unavailable"
}
```

**Response (Error - 401):**
```json
{
  "success": false,
  "message": "Unauthorized. Admin access required."
}
```

---

## Implementation Steps

### Step 1: Load Pre-trained Model

```python
# forecasting.service.py
import joblib
import os

MODEL_PATH = "models/uniform_forecast.pkl"

def load_model():
    """Load pre-trained ML model from .pkl file"""
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Model file not found: {MODEL_PATH}")
    
    model = joblib.load(MODEL_PATH)
    return model
```

### Step 2: Get Historical Data

```sql
-- Query historical uniform usage data
SELECT 
    uniform_type,
    size,
    COUNT(*) as total_issued,
    AVG(quantity) as avg_quantity,
    MAX(issue_date) as last_issue_date
FROM historical_uniform_usage
GROUP BY uniform_type, size
ORDER BY uniform_type, size;
```

**Or if using Node.js:**

```javascript
// Get historical data from database
const historicalData = await db.query(`
  SELECT 
    uniform_type,
    size,
    COUNT(*) as total_issued,
    AVG(quantity) as avg_quantity,
    MAX(issue_date) as last_issue_date
  FROM historical_uniform_usage
  GROUP BY uniform_type, size
  ORDER BY uniform_type, size
`);
```

### Step 3: Prepare Feature Vector

Transform historical data into the format expected by your ML model:

```python
import pandas as pd

def prepare_features(historical_data):
    """Convert historical data to feature vector for ML model"""
    df = pd.DataFrame(historical_data)
    
    # Add any feature engineering here
    # Example: one-hot encoding, scaling, etc.
    
    return df
```

### Step 4: Run Predictions

```python
def predict_demand(model, input_df):
    """Run predictions using pre-trained model"""
    predictions = model.predict(input_df)
    
    # Calculate recommended stock (e.g., 15% buffer)
    input_df["predicted_demand"] = predictions
    input_df["recommended_stock"] = (predictions * 1.15).round().astype(int)
    
    # Ensure minimum stock level
    input_df["recommended_stock"] = input_df["recommended_stock"].apply(
        lambda x: max(x, 2)  # Minimum 2 units
    )
    
    return input_df
```

**⚠️ IMPORTANT:** 
- **NO `.fit()` or `.train()`** - Model is already trained
- **ONLY `.predict()`** - Just run inference

### Step 5: Save to Database

```sql
-- Clear old recommendations
DELETE FROM recommended_stock;

-- Insert new recommendations
INSERT INTO recommended_stock 
  (category, type, size, forecasted_demand, recommended_stock, analysis_date, source)
VALUES 
  (?, ?, ?, ?, ?, NOW(), 'ml_model');
```

**Or using Node.js:**

```javascript
// Clear old recommendations
await db.query('DELETE FROM recommended_stock');

// Insert new recommendations
for (const row of forecastResults) {
  await db.query(`
    INSERT INTO recommended_stock
    (category, type, size, forecasted_demand, recommended_stock, analysis_date, source)
    VALUES (?, ?, ?, ?, ?, NOW(), 'ml_model')
  `, [
    row.category || row.uniform_type,
    row.type || row.uniform_type,
    row.size,
    row.predicted_demand,
    row.recommended_stock
  ]);
}
```

---

## Complete Implementation Example

### Python Service (forecasting.service.py)

```python
import joblib
import pandas as pd
from datetime import datetime
import os

MODEL_PATH = "models/uniform_forecast.pkl"

class ForecastingService:
    def __init__(self):
        self.model = None
        self.load_model()
    
    def load_model(self):
        """Load pre-trained ML model"""
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(f"Model file not found: {MODEL_PATH}")
        self.model = joblib.load(MODEL_PATH)
    
    def prepare_features(self, historical_data):
        """Convert historical data to feature vector"""
        df = pd.DataFrame(historical_data)
        # Add feature engineering here
        return df
    
    def predict_demand(self, input_df):
        """Run predictions"""
        predictions = self.model.predict(input_df)
        
        input_df["predicted_demand"] = predictions
        input_df["recommended_stock"] = (predictions * 1.15).round().astype(int)
        input_df["recommended_stock"] = input_df["recommended_stock"].apply(
            lambda x: max(x, 2)
        )
        
        return input_df
    
    def run_forecast(self, historical_data):
        """Main forecast function"""
        # Prepare features
        features_df = self.prepare_features(historical_data)
        
        # Run predictions
        results_df = self.predict_demand(features_df)
        
        # Convert to list of dicts for database insertion
        recommendations = results_df.to_dict('records')
        
        return recommendations
```

### Node.js Controller (forecasting.controller.js)

```javascript
const ForecastingService = require('../services/forecasting.service');
const db = require('../config/database');

const forecastingService = new ForecastingService();

exports.runForecast = async (req, res) => {
  try {
    // 1. Verify admin access
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Admin access required"
      });
    }

    // 2. Get historical data from database
    const historicalData = await db.query(`
      SELECT 
        uniform_type,
        size,
        COUNT(*) as total_issued,
        AVG(quantity) as avg_quantity,
        MAX(issue_date) as last_issue_date
      FROM historical_uniform_usage
      GROUP BY uniform_type, size
      ORDER BY uniform_type, size
    `);

    if (!historicalData || historicalData.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No historical data available for forecasting"
      });
    }

    // 3. Call Python prediction service
    const forecastResults = await forecastingService.runForecast(historicalData);

    // 4. Clear old recommendations
    await db.query('DELETE FROM recommended_stock');

    // 5. Save new recommendations
    let insertedCount = 0;
    for (const row of forecastResults) {
      await db.query(`
        INSERT INTO recommended_stock
        (category, type, size, forecasted_demand, recommended_stock, analysis_date, source)
        VALUES (?, ?, ?, ?, ?, NOW(), 'ml_model')
      `, [
        row.category || row.uniform_type || 'Others',
        row.type || row.uniform_type,
        row.size || null,
        row.predicted_demand || row.forecasted_demand,
        row.recommended_stock
      ]);
      insertedCount++;
    }

    // 6. Return success response
    res.json({
      success: true,
      message: `Forecast generated successfully. ${insertedCount} recommendations created.`,
      generated: insertedCount
    });

  } catch (error) {
    console.error('Forecast generation error:', error);
    res.status(500).json({
      success: false,
      message: `Failed to generate forecast: ${error.message}`,
      error: error.message
    });
  }
};
```

### Node.js Route (forecasting.routes.js)

```javascript
const express = require('express');
const router = express.Router();
const forecastingController = require('../controllers/forecasting.controller');
const { authenticate, requireAdmin } = require('../middleware/auth');

// Run forecast (Admin only)
router.post('/run', authenticate, requireAdmin, forecastingController.runForecast);

module.exports = router;
```

---

## Database Schema

Ensure your `recommended_stock` table has these columns:

```sql
CREATE TABLE recommended_stock (
  id INT PRIMARY KEY AUTO_INCREMENT,
  category VARCHAR(255),
  type VARCHAR(255),
  size VARCHAR(50),
  forecasted_demand INT,
  recommended_stock INT,
  analysis_date DATETIME,
  source VARCHAR(50) DEFAULT 'ml_model',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_category_type (category, type),
  INDEX idx_type_size (type, size)
);
```

---

## Model File Location

Store your pre-trained model file at:
```
backend/
  models/
    uniform_forecast.pkl
```

**Important:**
- Model file must be uploaded by admin/developer (NOT by users)
- Model file should be versioned and backed up
- Model should be trained offline in Google Colab or similar

---

## Testing

### Test Request (using curl)

```bash
curl -X POST http://localhost:5000/api/forecast/run \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

### Expected Response

```json
{
  "success": true,
  "message": "Forecast generated successfully. 50 recommendations created.",
  "generated": 50
}
```

---

## Error Handling

Handle these cases:

1. **Model file not found:**
   ```json
   {
     "success": false,
     "message": "Pre-trained model not found. Please upload a model first.",
     "error": "Model file not found: models/uniform_forecast.pkl"
   }
   ```

2. **No historical data:**
   ```json
   {
     "success": false,
     "message": "No historical data available for forecasting"
   }
   ```

3. **Prediction error:**
   ```json
   {
     "success": false,
     "message": "Failed to generate forecast: Prediction error",
     "error": "Feature mismatch: expected 10 features, got 8"
   }
   ```

4. **Database error:**
   ```json
   {
     "success": false,
     "message": "Failed to save recommendations to database",
     "error": "Database connection error"
   }
   ```

---

## Key Differences from Old System

| Old System | New System |
|------------|------------|
| User uploads JSON file | User clicks "Forecast" button |
| `/api/recommended-stock/import` | `/api/forecast/run` |
| Static data from Colab | Dynamic predictions from ML model |
| No ML model needed | Pre-trained ML model required |
| Manual process | Automated process |

---

## Frontend Integration

The frontend will call this endpoint when user clicks "Forecast Uniform Demand" button:

```typescript
// Frontend code (already implemented)
const result = await forecastService.runForecast();
// POST /api/forecast/run
```

After successful response, frontend will:
1. Show success message
2. Refresh recommendations from `/api/recommended-stock`
3. Auto-display graph

---

## Summary

✅ **What Backend Needs to Do:**
1. Implement `POST /api/forecast/run` endpoint
2. Load pre-trained `.pkl` model file
3. Query historical data from database
4. Run `model.predict()` (NO training)
5. Save results to `recommended_stock` table
6. Return success response with count

❌ **What Backend Should NOT Do:**
- Train models (done offline)
- Accept JSON uploads from users
- Require user to upload model files

---

## Questions?

If you need clarification on:
- Model format/requirements
- Feature engineering
- Database schema
- Error handling

Please refer to this document or contact the frontend team.
