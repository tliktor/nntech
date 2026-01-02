# NNTECH Invoice Data API - WooCommerce Plugin

WordPress plugin that provides order data API for NNTECH invoice matching system.

## Installation

### Method 1: Direct Upload
1. Download `nntech-invoice-data.php`
2. Upload to `/wp-content/plugins/` directory
3. Activate in WordPress Admin → Plugins

### Method 2: ZIP Install
1. Create ZIP file containing `nntech-invoice-data.php`
2. WordPress Admin → Plugins → Add New → Upload Plugin
3. Upload ZIP and activate

## Configuration

1. Go to **Settings → NNTECH Invoice API**
2. Copy the API Key and Endpoint URL
3. Use these in your NNTECH system configuration

## API Usage

**Endpoint:** `GET /wp-json/nntech/v1/orders`

**Headers:**
```
X-API-Key: [your-api-key]
```

**Parameters:**
- `from_date` (optional): Start date (YYYY-MM-DD)
- `to_date` (optional): End date (YYYY-MM-DD)

**Example:**
```bash
curl -H "X-API-Key: your-api-key-here" \
  "https://yoursite.com/wp-json/nntech/v1/orders?from_date=2024-01-01&to_date=2024-01-31"
```

## Requirements

- WordPress 5.0+
- WooCommerce 5.0+
- PHP 7.4+

## Features

- ✅ Secure API key authentication
- ✅ Date range filtering
- ✅ Returns completed/processing orders only
- ✅ Admin interface for API key management
- ✅ WooCommerce dependency check