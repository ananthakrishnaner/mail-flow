# Email Tracking System Documentation

## How Email Tracking Works

### Overview
Mail Muse tracks email opens and clicks using:
- **Open Tracking:** Invisible 1x1 transparent GIF pixels
- **Click Tracking:** Redirect URLs that log clicks before forwarding

### Tracking Flow

```
1. Email Sent with Tracking
   ↓
2. Tracking Elements Embedded
   - Open: <img src="https://domain.com/api/track-email?id={log_id}&type=open" />
   - Click: <a href="https://domain.com/api/track-email?id={log_id}&type=click&url={original_url}">
   ↓
3. Recipient Opens Email
   ↓
4. Email Client Loads Images → Open Tracked
   ↓
5. Recipient Clicks Link → Click Tracked → Redirected to Original URL
```

## Technical Implementation

### 1. Open Tracking - Pixel Generation
**File:** `django_server/api/utils/mailer.py`

```python
def process_template_variables(html_content, recipient_email, recipient_name, log_id, tracking_enabled, base_url):
    if tracking_enabled:
        tracking_pixel_url = f"{base_url}/api/track-email?id={log_id}&type=open"
        tracking_pixel = f'<img src="{tracking_pixel_url}" alt="" width="1" height="1" style="display:none;visibility:hidden;" />'
        
        # Insert pixel before </body> tag or at end of email
        if '</body>' in processed.lower():
            processed = re.sub(r'</body>', f'{tracking_pixel}</body>', processed, flags=re.IGNORECASE)
        else:
            processed += tracking_pixel
```

**Pixel Placement Priority:**
1. If template has `{{tracking}}` placeholder → Replace it
2. If HTML has `</body>` tag → Insert before closing body tag
3. Otherwise → Append to end of HTML

### 2. Click Tracking - Link Wrapping
**Status:** ✅ Backend ready, needs frontend implementation

To track clicks, wrap links in emails:
```html
<!-- Original -->
<a href="https://example.com">Click here</a>

<!-- Tracked -->
<a href="https://your-domain.com/api/track-email?id={log_id}&type=click&url=https://example.com">Click here</a>
```

### 3. Tracking Endpoint
**File:** `django_server/api/views.py`

```python
class TrackEmailView(APIView):
    def get(self, request):
        log_id = request.GET.get('id')
        type_ = request.GET.get('type')
        url = request.GET.get('url')  # For click tracking
        
        if log_id:
            try:
                log = EmailLog.objects.get(id=log_id)
                campaign = log.campaign
                
                # Capture user agent and IP
                user_agent = request.META.get('HTTP_USER_AGENT', '')
                ip_address = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', ''))
                
                if type_ == 'open' and not log.opened_at:
                    log.opened_at = timezone.now()
                    log.user_agent = user_agent[:500]
                    log.ip_address = ip_address
                    log.save()
                    EmailCampaign.objects.filter(pk=campaign.pk).update(open_count=F('open_count') + 1)
                
                elif type_ == 'click' and not log.clicked_at:
                    log.clicked_at = timezone.now()
                    if not log.user_agent:
                        log.user_agent = user_agent[:500]
                        log.ip_address = ip_address
                    log.save()
                    EmailCampaign.objects.filter(pk=campaign.pk).update(click_count=F('click_count') + 1)
                    
                    # Redirect to actual URL
                    if url:
                        return HttpResponseRedirect(url)
                    
            except Exception as e:
                logger.error(f"Tracking error: {e}")

        # Return 1x1 transparent GIF
        pixel = base64.b64decode('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7')
        return HttpResponse(pixel, content_type='image/gif')
```

### 4. Data Captured

**EmailLog Model Fields:**
- `opened_at` - Timestamp of first open
- `clicked_at` - Timestamp of first click
- `user_agent` - Browser/email client info
- `ip_address` - IP address of opener/clicker

**EmailCampaign Model Fields:**
- `open_count` - Total opens (can be > recipients if opened multiple times)
- `click_count` - Total clicks

### 5. Base URL Configuration

**Scheduler (Scheduled Campaigns):**
```python
# django_server/api/utils/scheduler.py
base_url = settings.SITE_URL  # From .env
```

**API (Manual Campaigns):**
```python
# django_server/api/views.py - CampaignStartView
base_url = f"{request.scheme}://{request.get_host()}"  # Dynamic
```

**Environment Variable:**
```bash
# In .env
SITE_URL=https://your-domain.com
```

## Features & Improvements

### ✅ Implemented
1. **Open Tracking** - Invisible pixel tracking
2. **Click Tracking** - Redirect-based tracking with URL parameter
3. **User Agent Capture** - Identifies email client/browser
4. **IP Address Capture** - Geographic tracking capability
5. **Deduplication** - Only first open/click is recorded
6. **Atomic Counters** - Thread-safe campaign statistics
7. **Logging** - All tracking events logged for debugging

### 🔄 Limitations

**Open Tracking:**
- ❌ Blocked by email clients that disable images by default (Gmail, Outlook)
- ❌ Privacy-focused clients may block tracking pixels
- ❌ Text-only email clients won't load images
- ✅ Works in most modern email clients when images are enabled

**Click Tracking:**
- ✅ More reliable than open tracking
- ⚠️ Requires link wrapping (not yet implemented in template editor)
- ⚠️ Some spam filters may flag redirect URLs

### 📊 Analytics Available

**Campaign Level:**
- Total opens
- Total clicks
- Unique opens (distinct recipients)
- Unique clicks (distinct recipients)
- Open rate = (unique opens / total sent) × 100%
- Click rate = (unique clicks / total sent) × 100%

**Individual Level:**
- Per-recipient open/click status
- Timestamp of first open/click
- User agent (device/client info)
- IP address (location)

## Testing Tracking

### Test Open Tracking
1. Send a test campaign
2. Open the email in your email client
3. Enable images if prompted
4. Check campaign analytics - open_count should increment
5. Check EmailLog - `opened_at` should be set

### Test Click Tracking
1. Create an email with a tracked link:
   ```html
   <a href="https://your-domain.com/api/track-email?id=LOG_ID&type=click&url=https://google.com">
     Click me
   </a>
   ```
2. Click the link in the email
3. Should redirect to google.com
4. Check campaign analytics - click_count should increment
5. Check EmailLog - `clicked_at` should be set

## Troubleshooting

### Opens Not Being Tracked
1. **Check if tracking is enabled:**
   ```python
   config = MailConfig.objects.first()
   print(config.tracking_enabled)  # Should be True
   ```

2. **Check pixel URL:**
   - View email source
   - Look for `<img src=".../api/track-email?id=...&type=open"`
   - Verify URL uses production domain, not localhost

3. **Check email client:**
   - Gmail: Click "Display images" if prompted
   - Outlook: Enable "Download pictures"
   - Apple Mail: Usually loads images by default

4. **Check server logs:**
   ```bash
   tail -f /var/www/mail-flow/django_server/mailer.log | grep "Email opened"
   ```

### Clicks Not Being Tracked
1. **Check link format:**
   - Must include `?id={log_id}&type=click&url={original_url}`

2. **Check redirect:**
   - Click should redirect to original URL
   - If it doesn't, check server logs for errors

3. **Check server logs:**
   ```bash
   tail -f /var/www/mail-flow/django_server/mailer.log | grep "Email clicked"
   ```

## Privacy Considerations

- Tracking pixels are industry-standard but some consider them invasive
- Always include privacy policy mentioning email tracking
- Consider adding unsubscribe links to all campaigns
- IP addresses may be considered PII in some jurisdictions (GDPR)
- User agents can reveal device/OS information

## Future Enhancements

- [ ] Link click tracking in template editor
- [ ] Geographic location from IP address
- [ ] Device/client breakdown in analytics
- [ ] Heatmap of click locations in email
- [ ] A/B testing support
- [ ] Unsubscribe tracking
- [ ] Bounce tracking (via webhooks)

