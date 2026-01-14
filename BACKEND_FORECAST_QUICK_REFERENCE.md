# Backend Forecast - Quick Reference

## 🎯 New Endpoint Required

### `POST /api/forecast/run`

**Purpose:** Generate forecast recommendations automatically (no JSON upload needed)

**Auth:** Admin only

**Request:**
```http
POST /api/forecast/run
Authorization: Bearer <admin_token>
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Forecast generated successfully",
  "generated": 50
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Failed to generate forecast: <error>",
  "error": "<error details>"
}
```

---

## 📋 Implementation Checklist

- [ ] Create `POST /api/forecast/run` endpoint
- [ ] Load pre-trained model from `models/uniform_forecast.pkl`
- [ ] Query historical data from database
- [ ] Run `model.predict()` (NO training!)
- [ ] Calculate recommended stock (e.g., `predicted * 1.15`)
- [ ] Clear old `recommended_stock` records
- [ ] Insert new recommendations
- [ ] Return success response with count

---

## 🔧 Quick Implementation (Node.js)

```javascript
// routes/forecast.routes.js
router.post('/run', authenticate, requireAdmin, forecastingController.runForecast);

// controllers/forecasting.controller.js
exports.runForecast = async (req, res) => {
  try {
    // 1. Get historical data
    const data = await db.query(`
      SELECT uniform_type, size, COUNT(*) as total_issued
      FROM historical_uniform_usage
      GROUP BY uniform_type, size
    `);

    // 2. Call Python prediction service
    const results = await forecastingService.runForecast(data);

    // 3. Clear old & save new
    await db.query('DELETE FROM recommended_stock');
    for (const row of results) {
      await db.query(`
        INSERT INTO recommended_stock
        (category, type, size, forecasted_demand, recommended_stock, analysis_date, source)
        VALUES (?, ?, ?, ?, ?, NOW(), 'ml_model')
      `, [row.category, row.type, row.size, row.predicted_demand, row.recommended_stock]);
    }

    res.json({ success: true, message: "Forecast generated", generated: results.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, error: error.message });
  }
};
```

---

## 🐍 Python Service (if using Python)

```python
# services/forecasting.service.py
import joblib
import pandas as pd

def run_forecast(historical_data):
    # Load model
    model = joblib.load("models/uniform_forecast.pkl")
    
    # Prepare features
    df = pd.DataFrame(historical_data)
    
    # Predict (NO .fit() - model is pre-trained!)
    predictions = model.predict(df)
    
    # Calculate recommended stock
    df["predicted_demand"] = predictions
    df["recommended_stock"] = (predictions * 1.15).round().astype(int)
    df["recommended_stock"] = df["recommended_stock"].apply(lambda x: max(x, 2))
    
    return df.to_dict('records')
```

---

## 📊 Database Table

```sql
-- Ensure recommended_stock table exists
CREATE TABLE IF NOT EXISTS recommended_stock (
  id INT PRIMARY KEY AUTO_INCREMENT,
  category VARCHAR(255),
  type VARCHAR(255),
  size VARCHAR(50),
  forecasted_demand INT,
  recommended_stock INT,
  analysis_date DATETIME,
  source VARCHAR(50) DEFAULT 'ml_model',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## ⚠️ Important Notes

1. **NO Training:** Only use `model.predict()`, never `.fit()` or `.train()`
2. **Model Location:** Store `.pkl` file at `backend/models/uniform_forecast.pkl`
3. **Admin Only:** Endpoint must require admin authentication
4. **Clear Old Data:** Delete old recommendations before inserting new ones
5. **Error Handling:** Return proper error messages for debugging

---

## 🧪 Test Command

```bash
curl -X POST http://localhost:5000/api/forecast/run \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

---

## 📚 Full Documentation

See `BACKEND_FORECAST_RUN_ENDPOINT.md` for complete implementation guide.
