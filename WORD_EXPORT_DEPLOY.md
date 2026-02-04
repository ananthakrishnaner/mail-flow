# Quick Deployment Guide - Word Export

## ✅ Changes Made

1. **Backend:** Added Word export functionality to `StatsExportView`
2. **Frontend:** Changed dashboard download button from CSV to Word
3. **Dependencies:** Added `python-docx==1.1.0`

## 🚀 Deploy to Production

### Step 1: Install Dependencies
```bash
cd /var/www/mail-flow/django_server
source venv/bin/activate  # If using venv
pip install python-docx==1.1.0
```

### Step 2: Copy Built Files
```bash
# From your local machine, copy the dist folder
cd /Users/ananthakrishnaner/Desktop/Project/mail-muse-main
scp -r dist/* user@server:/var/www/mail-flow/dist/

# Or on server, pull and rebuild:
cd /var/www/mail-flow
git pull
npm run build
```

### Step 3: Restart Services
```bash
sudo systemctl restart mail-muse
sudo systemctl restart nginx  # If needed
```

### Step 4: Verify
```bash
# Check service status
sudo systemctl status mail-muse

# Test Word export
curl "https://mail.ak-hospitql.com/api/stats/export?type=docx&campaign_id=YOUR_CAMPAIGN_ID" -o test.docx

# Verify it's a Word file
file test.docx  # Should show: Microsoft Word 2007+
```

## 🧪 Test in Browser

1. Go to https://mail.ak-hospitql.com
2. Navigate to Dashboard
3. Click download icon on any campaign
4. Should download a `.docx` file
5. Open in Word/Google Docs to verify formatting

## 📝 What Changed

**Before:**
- Download button → CSV file
- Basic text export

**After:**
- Download button → Word document (.docx)
- Professional formatting with:
  - Blue title
  - Color-coded tables
  - Campaign summary
  - Statistics
  - Recipient details
  - Timestamped footer

## ⚠️ Troubleshooting

**If download still shows CSV:**
1. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear browser cache
3. Check that frontend was rebuilt: `ls -la dist/assets/` (should see new timestamp)

**If Word export fails:**
1. Check python-docx is installed: `pip list | grep python-docx`
2. Check server logs: `tail -f /var/www/mail-flow/django_server/mailer.log`
3. Verify campaign_id exists in database

**If file is corrupted:**
1. Check file size: `ls -lh test.docx` (should be > 10KB)
2. Try different campaign
3. Check for errors in Django logs
