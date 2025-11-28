# Budget Mobile App

A lightweight mobile web application for managing your budget on the go.

## Features

cd c:\Users\Yousfi Marwen\Desktop\Angular Project\Budget
json-server --watch db.json
```

The server should be running on `http://localhost:3000`

### 2. Open the Mobile App

Simply open `index.html` in your mobile browser or use a local server:

**Option A: Direct File**
- Navigate to `mobile-app/index.html` and open it in your browser

**Option B: Local Server (Recommended)**
```bash
cd mobile-app
npx http-server -p 8080
```

Then open `http://localhost:8080` on your mobile device or browser.

### 3. Add to Home Screen (iOS/Android)

For a native app-like experience:

**iOS:**
1. Open the app in Safari
2. Tap the Share button
3. Select "Add to Home Screen"

**Android:**
1. Open the app in Chrome
2. Tap the menu (3 dots)
3. Select "Add to Home screen"

## Features Overview

### Summary Dashboard
- **Total Balance**: Shows your current balance (Income - Expense)
- **Total Income**: Sum of all income for the current month
- **Total Expense**: Sum of all expenses for the current month

### Add Transaction
- Tap the **+** button to add a new transaction
- Fill in:
  - Title (e.g., "Groceries")
  - Amount
  - Type (Income or Expense)
  - Category (auto-filtered based on type)
  - Date (defaults to today)

### Recent Transactions
- View your last 10 transactions
- Shows title, category, date, and amount
- Color-coded: green for income, red for expense

### Pull to Refresh
- Pull down from the top of the screen to refresh data

## Technical Details

- **Pure HTML/CSS/JavaScript** - No build process required
- **Mobile-first design** - Optimized for touch interactions
- **Responsive** - Works on all screen sizes
- **API Integration** - Connects to json-server at `localhost:3000`
- **Modern UI** - Gradient cards, smooth animations, touch feedback

## API Endpoints Used

- `GET /transactions` - Fetch all transactions
- `POST /transactions` - Add new transaction
- `GET /categories` - Fetch categories for dropdown

## Customization

### Change API URL

Edit `app.js` line 2:
```javascript
const API_URL = 'http://your-api-url.com';
```

### Modify Colors

Edit CSS variables in `styles.css`:
```css
:root {
    --primary-color: #6366f1;
    --success-color: #10b981;
    --danger-color: #ef4444;
    /* ... */
}
```

## Browser Compatibility

- ✅ Chrome (Android)
- ✅ Safari (iOS)
- ✅ Firefox
- ✅ Edge

## Future Enhancements

- Offline support with Service Workers
- Transaction editing/deletion
- Filtering by date range
- Category-wise breakdown
- Budget alerts
- Biometric authentication
