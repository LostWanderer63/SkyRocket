// Promo codes. In production these would live in the DB / a marketing service.
interface Coupon {
  type: "percent" | "flat";
  value: number; // percent (0-100) or flat amount in the booking currency units
  minAmount?: number;
  label: string;
}

const COUPONS: Record<string, Coupon> = {
  SAVE10: { type: "percent", value: 10, label: "10% off your trip" },
  FIRST15: { type: "percent", value: 15, minAmount: 100, label: "15% off (min spend 100)" },
  FLAT500: { type: "flat", value: 500, minAmount: 1000, label: "Flat 500 off over 1000" },
  WELCOME: { type: "flat", value: 25, label: "25 off, welcome aboard" },
};

export interface CouponResult {
  valid: boolean;
  code?: string;
  discount: number;
  message: string;
  label?: string;
}

export function applyCoupon(rawCode: string, amount: number): CouponResult {
  const code = rawCode.trim().toUpperCase();
  const c = COUPONS[code];
  if (!c) return { valid: false, discount: 0, message: "Invalid promo code" };
  if (c.minAmount && amount < c.minAmount) {
    return { valid: false, discount: 0, message: `Spend at least ${c.minAmount} to use ${code}` };
  }
  const discount = c.type === "percent"
    ? Math.round((amount * c.value) / 100)
    : Math.min(c.value, amount);
  return { valid: true, code, discount, message: `${code} applied — you save ${discount}`, label: c.label };
}
