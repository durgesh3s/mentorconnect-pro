/**
 * Razorpay Payment Gateway Utility
 * Handles order creation and signature verification
 */

import Razorpay from 'razorpay';
import crypto from 'crypto';

// Initialize Razorpay instance
let razorpayInstance: Razorpay | null = null;

export function getRazorpayInstance(): Razorpay {
  if (!razorpayInstance) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      throw new Error('Razorpay credentials not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment variables.');
    }

    razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  return razorpayInstance;
}

/**
 * Create a Razorpay order
 * @param amount Amount in paise (smallest currency unit)
 * @param currency Currency code (default: INR)
 * @param receipt Receipt identifier
 * @param notes Additional notes/metadata
 */
export async function createRazorpayOrder(
  amount: number,
  currency: string = 'INR',
  receipt?: string,
  notes?: Record<string, string>
): Promise<{ id: string; amount: number; currency: string; receipt?: string; status: string }> {
  try {
    const razorpay = getRazorpayInstance();

    const orderOptions: any = {
      amount: amount, // Amount in paise
      currency: currency,
      // Generate a short receipt if not provided (Razorpay max length is 40 chars)
      receipt: receipt || `rcpt_${Date.now().toString().slice(-10)}`, // ~14 characters
    };

    if (notes) {
      orderOptions.notes = notes;
    }

    const order = await razorpay.orders.create(orderOptions);
    
    return {
      id: order.id,
      amount: typeof order.amount === 'string' ? parseInt(order.amount, 10) : order.amount,
      currency: order.currency,
      receipt: order.receipt,
      status: order.status,
    };
  } catch (error: any) {
    console.error('Razorpay order creation error:', error);
    
    // Extract detailed error information
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (error?.error) {
      // Razorpay SDK errors often have an error property
      const razorpayError = error.error;
      if (razorpayError.description) {
        errorMessage = razorpayError.description;
      } else if (razorpayError.message) {
        errorMessage = razorpayError.message;
      } else if (typeof razorpayError === 'string') {
        errorMessage = razorpayError;
      }
    } else if (error?.description) {
      errorMessage = error.description;
    } else if (error?.message) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    // Log additional error details for debugging
    console.error('Razorpay error details:', {
      message: errorMessage,
      error: error,
      hasKeyId: !!process.env.RAZORPAY_KEY_ID,
      hasKeySecret: !!process.env.RAZORPAY_KEY_SECRET,
    });
    
    throw new Error(`Failed to create Razorpay order: ${errorMessage}`);
  }
}

/**
 * Verify Razorpay payment signature
 * @param orderId Razorpay order ID
 * @param paymentId Razorpay payment ID
 * @param signature Razorpay signature
 */
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    
    if (!keySecret) {
      console.error('RAZORPAY_KEY_SECRET not configured');
      return false;
    }

    // Create the signature string
    const signatureString = `${orderId}|${paymentId}`;
    
    // Generate expected signature
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(signatureString)
      .digest('hex');

    // Compare signatures using constant-time comparison to prevent timing attacks
    // Razorpay signatures are hex strings, so compare them directly
    if (signature.length !== expectedSignature.length) {
      return false;
    }
    
    // Convert to buffers for timing-safe comparison
    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    
    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch (error) {
    console.error('Razorpay signature verification error:', error);
    return false;
  }
}

/**
 * Fetch payment details from Razorpay
 */
export async function getRazorpayPayment(paymentId: string): Promise<any> {
  try {
    const razorpay = getRazorpayInstance();
    const payment = await razorpay.payments.fetch(paymentId);
    return payment;
  } catch (error) {
    console.error('Razorpay fetch payment error:', error);
    throw new Error(`Failed to fetch payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
