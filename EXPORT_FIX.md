# Export URL Fix

## Issue
Campaign export was using hardcoded `http://localhost:8000` instead of the actual domain, causing downloads to fail in production.

## Root Cause
`RecentCampaigns.tsx` had a hardcoded localhost URL:
```typescript
href={`http://localhost:8000/api/stats/export?type=csv&campaign_id=${campaign.id}`}
```

## Fix Applied
Replaced hardcoded URL with dynamic `API_URL` constant:
```typescript
const API_URL = import.meta.env.VITE_API_URL || '/api';

// In the export link:
href={`${API_URL}/stats/export?type=csv&campaign_id=${campaign.id}`}
```

## How It Works

### Development (Local)
- Uses `/api` which is proxied by Vite dev server to `localhost:8000`

### Production
- Uses `/api` which is served by nginx reverse proxy
- nginx forwards `/api/*` requests to the Django backend
- Downloads work correctly with the production domain

## Deployment

```bash
cd /var/www/mail-flow
git pull
npm run build
sudo systemctl restart nginx
```

## Testing

1. **Go to Dashboard** → Recent Campaigns section
2. **Click the Download icon** on any campaign
3. **Verify URL** - Should be `https://your-domain.com/api/stats/export?type=csv&campaign_id=...`
4. **Download should work** - CSV file downloads successfully

## Related Files

- `/src/components/dashboard/RecentCampaigns.tsx` - Fixed export URL
- `/src/lib/api.ts` - Contains API_URL configuration (already correct)
- `/src/pages/Analytics.tsx` - Uses API_URL correctly (no changes needed)

## Environment Variables

No `.env` changes needed! The default `/api` works perfectly with nginx reverse proxy.

If you ever need to override the API URL, you can add to `.env`:
```bash
VITE_API_URL=https://your-custom-api-domain.com/api
```

But for standard deployment with nginx reverse proxy, the default `/api` is correct.
