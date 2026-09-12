# Celebrate Cinema 2026 — Whistling Woods International 🎬

Official event registration and attendee management platform for **Celebrate Cinema 2026** at **Whistling Woods International (Film City, Mumbai)**.

---

## 🌟 Key Features

- **Cinematic Experience**: Dark theme with WWI brand colors (`#af1996`, gold, deep purple), glassmorphism, floating particles, bokeh background, and smooth micro-interactions.
- **Dynamic Pricing & Discounts**:
  - Early Bird Price: ₹150
  - Dynamic coupon code validator with instant discount calculation
  - Viral referral link generator for students with automated tracking
- **Secure UPI Payment**: QR code scanner payment interface with transaction ID reference & optional payment screenshot upload.
- **Dynamic Entry Ticket Passes**: Generates a high-resolution, branded QR code on registration completion containing verified pass metadata.
- **Public Wall of Fame**: Live gallery of registered cinephiles with animated badge counters.
- **Private Admin Dashboard**:
  - Direct URL access (`#admin-login` with password protection)
  - Real-time stats (Total, Verified, Pending, Checked In, Revenue)
  - Ultra-smooth **Attendance Camera QR Scanner** with zero-latency audio beep, haptics, and anti-duplicate debounce
  - One-click payment verification & attendance toggles
  - Coupon manager (add/disable/remove promo codes)
  - Referral leaderboard
  - CSV export
- **Supabase Cloud Backend**: Connected to Supabase real-time database with automatic local offline fallback.

---

## 🚀 Quick Start

1. Clone this repository:
   ```bash
   git clone https://github.com/guptanilesh9877-oss/whistlingwoods.git
   cd whistlingwoods
   ```
2. Serve locally with any static server:
   ```bash
   npx serve .
   ```
3. Open `http://localhost:3000` in your browser.

---

## 🔐 Admin Access

- **Route**: `/#admin-login`
- **Default Password**: `Admin@vigor`
