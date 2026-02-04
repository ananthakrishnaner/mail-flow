# Campaign Start Modes

## Overview
When starting a campaign, you can now specify a **mode** to control how the campaign behaves.

## Available Modes

### 1. **Start** (Default)
- **Status:** `sending` → `sent`/`failed`
- **Behavior:** Immediately begins sending emails to all recipients
- **Use Case:** Ready to send campaign right away

**API Request:**
```bash
POST /api/campaigns/{id}/start
{
  "mode": "start"
}
```

### 2. **Draft**
- **Status:** `draft`
- **Behavior:** Saves campaign without sending any emails
- **Use Case:** Prepare campaign for later, review before sending

**API Request:**
```bash
POST /api/campaigns/{id}/start
{
  "mode": "draft"
}
```

### 3. **Pause**
- **Status:** `paused`
- **Behavior:** Sets campaign to paused state (can resume later)
- **Use Case:** Temporarily halt a campaign

**API Request:**
```bash
POST /api/campaigns/{id}/start
{
  "mode": "pause"
}
```

## Testing

### Test Any Campaign
```bash
python test_campaign_minimal.py
```

### Test Draft Campaign Only
```bash
python test_campaign_minimal.py draft
```

### Test Paused Campaign Only
```bash
python test_campaign_minimal.py paused
```

## API Response

All modes return:
```json
{
  "success": true,
  "message": "Campaign [action]",
  "status": "[new_status]"
}
```

## Frontend Integration

Update your campaign start button to include mode selection:

```typescript
const startCampaign = async (campaignId: string, mode: 'draft' | 'start' | 'pause') => {
  const response = await api.post(`/campaigns/${campaignId}/start`, { mode });
  return response.data;
};
```

## Notes

- If no mode is specified, defaults to `'start'`
- Invalid modes return 400 Bad Request
- All mode changes are logged in server logs
