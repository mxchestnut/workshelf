# Automated Pricing System Guide

## Overview

The WorkShelf automated pricing system helps you maintain competitive prices while protecting profit margins. It scrapes competitor prices from Amazon, Google Books, and Apple Books, then calculates optimal pricing based on your business model.

## Key Features

- **Multi-Source Scraping**: Checks prices from 3 major ebook retailers
- **Margin Protection**: Ensures minimum 40% markup above costs
- **Smart Updates**: Only changes prices if difference is significant (>= $0.50)
- **Cost Transparency**: Shows exact breakdown of all costs and profits
- **Revenue Model**: 70% to author, 30% to platform (minus Stripe fees)

## Pricing Formula

### Minimum Price Calculation
```
Minimum Price = (Stripe Fixed Fee) / (1 - Author Split - Stripe % - Min Profit %)
              = $0.30 / (1 - 0.70 - 0.029 - 0.10)
              = $0.30 / 0.171
              = ~$1.75
```

### Optimal Price Logic
```python
if competitive_price >= minimum_price:
    use competitive_price  # $1 below market
else:
    use minimum_price      # Protect margins
```

Where:
- `competitive_price = lowest_market_price - $1.00`
- `minimum_price = cost × 1.40` (40% markup)

## API Endpoints

### 1. Analyze Prices (Preview Only)

**Endpoint**: `POST /api/v1/admin/prices/analyze`

**Purpose**: Preview what prices would change without making updates

**Request Body**:
```json
{
  "store_item_ids": [1, 2, 3],  // Optional: specific items, or omit for all
  "force_update": false          // Optional: ignore update threshold
}
```

**Response**:
```json
[
  {
    "store_item_id": 1,
    "title": "1984",
    "current_price": 12.99,
    "recommended_price": 13.99,
    "price_change": 1.00,
    "market_prices": {
      "amazon": 14.99,
      "google": 15.99,
      "apple": 13.99
    },
    "reason": "Competitive pricing: $1 below lowest market ($13.99)",
    "cost_breakdown": {
      "sale_price": 13.99,
      "author_earnings": 9.79,
      "platform_revenue": 4.20,
      "stripe_fee": 0.71,
      "platform_net": 3.49,
      "profit_margin": 24.9
    },
    "should_update": true
  }
]
```

**cURL Example**:
```bash
curl -X POST https://workshelf.dev/api/v1/admin/prices/analyze \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"store_item_ids": [1, 2, 3]}'
```

### 2. Update Prices (Apply Changes)

**Endpoint**: `POST /api/v1/admin/prices/update`

**Purpose**: Analyze and update prices in the database

**Request Body**:
```json
{
  "store_item_ids": [1, 2, 3],  // Optional: specific items, or omit for all
  "force_update": false          // Optional: update even if change is small
}
```

**Response**:
```json
{
  "total_items": 95,
  "items_analyzed": 95,
  "items_updated": 23,
  "items_skipped": 67,
  "items_failed": 5,
  "updates": [
    // Same structure as analyze endpoint
  ]
}
```

**cURL Example**:
```bash
curl -X POST https://workshelf.dev/api/v1/admin/prices/update \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"force_update": false}'
```

### 3. Get Minimum Price

**Endpoint**: `GET /api/v1/admin/prices/minimum`

**Purpose**: Get the absolute minimum viable price

**Response**:
```json
{
  "minimum_price": 1.75,
  "cost_breakdown": {
    "sale_price": 1.75,
    "author_earnings": 1.23,
    "platform_revenue": 0.52,
    "stripe_fee": 0.35,
    "platform_net": 0.17,
    "profit_margin": 10.0
  },
  "explanation": "This is the absolute minimum price that covers author split (70%), Stripe fees (2.9% + $0.30), and maintains minimum profit margin"
}
```

**cURL Example**:
```bash
curl https://workshelf.dev/api/v1/admin/prices/minimum \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 4. Validate Price

**Endpoint**: `POST /api/v1/admin/prices/validate?price=9.99`

**Purpose**: Check if a manual price is acceptable

**Response**:
```json
{
  "is_valid": true,
  "price": 9.99,
  "minimum_price": 1.75,
  "cost_breakdown": {
    "sale_price": 9.99,
    "author_earnings": 6.99,
    "platform_revenue": 3.00,
    "stripe_fee": 0.59,
    "platform_net": 2.41,
    "profit_margin": 24.1
  },
  "warnings": [],
  "recommendations": []
}
```

**cURL Example**:
```bash
curl -X POST "https://workshelf.dev/api/v1/admin/prices/validate?price=9.99" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## Pricing Scenarios

### Scenario 1: Competitive Market
**Market**: Amazon $14.99, Google $15.99, Apple $13.99  
**Current**: $12.99  
**Recommendation**: $13.99 ($1 below lowest market)  
**Action**: ✅ Update (competitive, above minimum, significant change)

### Scenario 2: Market Too Low
**Market**: Amazon $9.99, Google $10.99, Apple N/A  
**Current**: $12.99  
**Recommendation**: $10.50 (minimum viable price)  
**Action**: ⚠️ Use minimum (market would be unprofitable)

### Scenario 3: High Market
**Market**: Amazon $19.99, Google $18.99, Apple $17.99  
**Current**: $12.99  
**Recommendation**: $16.99 ($1 below lowest market)  
**Action**: ✅ Update (significant profit opportunity)

### Scenario 4: No Market Data
**Market**: All sources unavailable  
**Current**: $12.99  
**Recommendation**: Keep $12.99  
**Action**: ⏭️ Skip (insufficient data to make decision)

### Scenario 5: Small Change
**Market**: Amazon $13.49, Google $14.99  
**Current**: $12.99  
**Recommendation**: $12.49 ($1 below lowest)  
**Action**: ⏭️ Skip (change < $0.50 threshold)

## Revenue Examples

### Example Book at $12.99

```
Sale Price:           $12.99
├── Author (70%):     $9.09
├── Platform (30%):   $3.90
│   ├── Stripe Fee:  -$0.68 (2.9% + $0.30)
│   └── Net Profit:   $3.22 (24.8% margin)
```

### Example Book at Minimum ($1.75)

```
Sale Price:           $1.75
├── Author (70%):     $1.23
├── Platform (30%):   $0.52
│   ├── Stripe Fee:  -$0.35 (2.9% + $0.30)
│   └── Net Profit:   $0.17 (10% margin)
```

### Example Book at $19.99 (high-value)

```
Sale Price:           $19.99
├── Author (70%):     $13.99
├── Platform (30%):   $6.00
│   ├── Stripe Fee:  -$0.88 (2.9% + $0.30)
│   └── Net Profit:   $5.12 (25.6% margin)
```

## Best Practices

### When to Run Updates

1. **New Books**: Analyze immediately after adding to store
2. **Weekly**: Run bulk update every Monday morning
3. **Promotions**: Check before major sales events
4. **Competitive Changes**: When you notice competitor price drops
5. **After Costs Change**: If Stripe fees or author split changes

### Update Strategy

```bash
# 1. Preview first (analyze only)
POST /api/v1/admin/prices/analyze

# 2. Review the recommendations
#    - Check items_updated count
#    - Review significant changes
#    - Look for warnings

# 3. Apply updates if satisfied
POST /api/v1/admin/prices/update
```

### Safety Checks

✅ **DO:**
- Preview with `/analyze` before updating
- Review cost_breakdown for each change
- Check profit_margin percentages
- Update during low-traffic hours
- Keep logs of price changes

❌ **DON'T:**
- Force update without reviewing
- Ignore warnings from validation
- Update more than once per week (can trigger repricing wars)
- Override minimum price protection
- Update during checkout peak times

## Testing Locally

Run the test script to verify everything works:

```bash
cd backend
python scripts/test_pricing.py
```

This will:
1. Test price scraping (real API calls)
2. Test pricing calculations
3. Show example scenarios
4. Verify all components work together

## Automation (Optional)

### Set Up Weekly Cron Job

Create a script `scripts/weekly_price_update.sh`:

```bash
#!/bin/bash
# Weekly price update for WorkShelf Store

TOKEN="your_admin_token_here"
API_URL="https://workshelf.dev/api/v1/admin"

echo "Starting weekly price update at $(date)"

# 1. Analyze prices
echo "Analyzing prices..."
ANALYSIS=$(curl -s -X POST "$API_URL/prices/analyze" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "$ANALYSIS" | jq '.'

# 2. Count how many need updates
SHOULD_UPDATE=$(echo "$ANALYSIS" | jq '[.[] | select(.should_update == true)] | length')

echo "Found $SHOULD_UPDATE items that need price updates"

# 3. If any updates needed, apply them
if [ "$SHOULD_UPDATE" -gt 0 ]; then
  echo "Applying price updates..."
  RESULT=$(curl -s -X POST "$API_URL/prices/update" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json")
  
  echo "$RESULT" | jq '.'
  
  UPDATED=$(echo "$RESULT" | jq '.items_updated')
  echo "Updated $UPDATED items"
else
  echo "No updates needed"
fi

echo "Weekly price update completed at $(date)"
```

Add to crontab:
```bash
# Run every Monday at 2am
0 2 * * 1 /path/to/weekly_price_update.sh >> /var/log/workshelf-pricing.log 2>&1
```

## Troubleshooting

### Issue: No market prices found

**Cause**: ISBN not found or APIs unavailable  
**Solution**: 
- Verify ISBN is correct
- Check if book is available digitally
- Use title search instead
- Wait and retry (APIs may be temporarily down)

### Issue: All prices below minimum

**Cause**: Market is selling at loss-leader prices  
**Solution**: 
- System will use minimum price (correct behavior)
- Consider if you want to match market and accept lower margins
- May indicate the book is in public domain or overpriced initially

### Issue: Prices not updating

**Cause**: Change is below $0.50 threshold  
**Solution**:
- Use `"force_update": true` to update anyway
- This is usually correct behavior to avoid frequent small changes

### Issue: High failure rate

**Cause**: Rate limiting or network issues  
**Solution**:
- Add delays between requests (currently not implemented)
- Run during off-peak hours
- Check API logs for specific errors

## Constants Reference

All pricing constants are in `backend/app/services/pricing_engine.py`:

```python
AUTHOR_SPLIT = Decimal('0.70')              # 70% to author
PLATFORM_SPLIT = Decimal('0.30')            # 30% to platform
STRIPE_PERCENTAGE = Decimal('0.029')        # 2.9% Stripe fee
STRIPE_FIXED = Decimal('0.30')              # $0.30 Stripe fee
MINIMUM_MARKUP = Decimal('1.40')            # 40% markup (1.4x cost)
COMPETITIVE_DISCOUNT = Decimal('1.00')      # $1 below market
MINIMUM_PROFIT_MARGIN = Decimal('0.10')     # 10% minimum net profit
SIGNIFICANT_CHANGE_THRESHOLD = Decimal('0.50')  # Only update if >= $0.50
```

## Support

For questions or issues:
- Check logs: Backend will log all price calculations
- Use `/validate` endpoint to understand why a price is recommended
- Review `cost_breakdown` in responses for exact calculations
- Test with single items before bulk updates
