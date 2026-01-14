# Razorpay Payment Gateway Integration Guide

This guide will walk you through integrating Razorpay payment gateway into your Mentorise application.

## Prerequisites

- Razorpay account (Sign up at https://razorpay.com/)
- Node.js backend
- React frontend

## Step 1: Create Razorpay Account & Get API Keys

1. **Sign up for Razorpay**
   - Go to https://razorpay.com/
   - Click "Sign Up" and create an account
   - Complete the KYC verification process

2. **Get API Keys**
   - Log in to Razorpay Dashboard
   - Go to **Settings** → **API Keys**
   - You'll see:
     - **Key ID** (starts with `rzp_test_` for test mode or `rzp_live_` for live mode)
     - **Key Secret** (click "Reveal" to see it)
   - Copy both keys (you'll need them in Step 2)

## Step 2: Install Razorpay SDK

### Backend Installation

```bash
cd backend
npm install razorpay
```

### Frontend Setup

The Razorpay checkout script is already included in `frontend/index.html`:
```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

## Step 3: Configure Environment Variables

### Backend (.env)

Add these variables to your `backend/.env` file:

```env
# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_key_secret_here
```

**Important:**
- Use `rzp_test_` keys for development/testing
- Use `rzp_live_` keys for production
- Never commit `.env` file to version control

### Frontend (.env)

Add this variable to your `frontend/.env` file:

```env
VITE_RAZORPAY_KEY=rzp_test_xxxxxxxxxxxxx
```

**Note:** Only the Key ID is needed in the frontend (public key). The Key Secret should ONLY be in the backend.

## Step 4: Code Integration

### Backend Integration

The integration is already implemented in:
- `backend/src/utils/razorpay.ts` - Razorpay utility functions
- `backend/src/routes/courses.ts` - Payment endpoints

**Key Functions:**
- `createRazorpayOrder()` - Creates a Razorpay order
- `verifyRazorpaySignature()` - Verifies payment signature

### Frontend Integration

The integration is already implemented in:
- `frontend/src/pages/courses/Subscribe.tsx` - Payment flow

## Step 5: Payment Flow

### How It Works

1. **User selects a subscription plan** on `/courses/:id/subscribe`
2. **Frontend calls** `POST /api/courses/:id/subscribe` with plan type
3. **Backend creates Razorpay order** and returns order details
4. **Frontend initializes Razorpay checkout** with order details
5. **User completes payment** via Razorpay modal
6. **Razorpay calls success handler** with payment details
7. **Frontend verifies payment** by calling `POST /api/courses/:id/verify-payment`
8. **Backend verifies signature** and enrolls user in course
9. **User is redirected** to course learning page

### API Endpoints

#### 1. Initialize Payment
```
POST /api/courses/:id/subscribe
Body: { plan: "monthly" | "quarterly" | "annual" }
Response: {
  orderId: "order_xxxxx",
  amount: 10000, // in paise
  currency: "INR",
  plan: "monthly"
}
```

#### 2. Verify Payment
```
POST /api/courses/:id/verify-payment
Body: {
  orderId: "order_xxxxx",
  paymentId: "pay_xxxxx",
  signature: "signature_xxxxx",
  plan: "monthly"
}
Response: {
  message: "Payment verified and enrollment completed",
  enrollment: { ... }
}
```

## Step 6: Testing

### Test Mode

1. Use test API keys (`rzp_test_...`)
2. Use Razorpay test cards:
   - **Success:** `4111 1111 1111 1111`
   - **Failure:** `4000 0000 0000 0002`
   - **CVV:** Any 3 digits
   - **Expiry:** Any future date
   - **Name:** Any name

### Test Payment Flow

1. Start your backend server:
   ```bash
   cd backend
   npm run dev
   ```

2. Start your frontend:
   ```bash
   cd frontend
   npm run dev
   ```

3. Navigate to a paid course subscription page
4. Select a plan and click "Subscribe"
5. Use test card details to complete payment
6. Verify enrollment is created successfully

## Step 7: Production Deployment

### Before Going Live

1. **Complete Razorpay KYC**
   - Submit all required documents
   - Wait for approval

2. **Switch to Live Keys**
   - Generate live API keys from Razorpay Dashboard
   - Update environment variables:
     - Backend: `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`
     - Frontend: `VITE_RAZORPAY_KEY`

3. **Configure Webhooks** (Optional but recommended)
   - Go to Razorpay Dashboard → Settings → Webhooks
   - Add webhook URL: `https://yourdomain.com/api/webhooks/razorpay`
   - Select events: `payment.captured`, `payment.failed`

4. **Test with Real Payment**
   - Make a small test payment with real card
   - Verify everything works correctly

### Security Checklist

- ✅ Key Secret is only in backend (never exposed to frontend)
- ✅ Payment signature is verified before enrollment
- ✅ Environment variables are not committed to git
- ✅ HTTPS is enabled in production
- ✅ Error handling is implemented

## Step 8: Troubleshooting

### Common Issues

#### 1. "Payment gateway not available"
- **Solution:** Ensure Razorpay script is loaded in `index.html`
- Check browser console for script loading errors

#### 2. "Payment gateway configuration missing"
- **Solution:** Check `VITE_RAZORPAY_KEY` is set in frontend `.env`
- Restart frontend dev server after adding env variable

#### 3. "Failed to create payment order"
- **Solution:** Check `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in backend `.env`
- Verify keys are correct (no extra spaces)
- Restart backend server after adding env variables

#### 4. "Invalid payment signature"
- **Solution:** This means signature verification failed
- Check that Key Secret matches between test/live mode
- Ensure order ID and payment ID are correct

#### 5. Payment succeeds but enrollment fails
- **Solution:** Check backend logs for errors
- Verify database connection is working
- Check that user and course exist

### Debug Mode

Enable detailed logging by checking:
- Browser console (frontend errors)
- Backend terminal (server logs)
- Razorpay Dashboard → Payments (payment status)

## Additional Resources

- [Razorpay Documentation](https://razorpay.com/docs/)
- [Razorpay API Reference](https://razorpay.com/docs/api/)
- [Razorpay Test Cards](https://razorpay.com/docs/payments/test-cards/)
- [Razorpay Webhooks](https://razorpay.com/docs/webhooks/)

## Support

If you encounter issues:
1. Check Razorpay Dashboard for payment status
2. Review backend logs for errors
3. Check browser console for frontend errors
4. Contact Razorpay support if payment-related

---

**Note:** This integration uses Razorpay's standard checkout flow. For custom UI, you can use Razorpay's Payment Links or Payment Pages API.
