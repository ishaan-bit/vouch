/**
 * UPI Intent URL Generator
 * Generates UPI deep links for peer-to-peer payments
 * Legal-safe: No pooling, no commissions, direct P2P transfers
 */

export interface UpiPaymentParams {
  payeeVpa: string;      // UPI VPA (e.g., user@upi, user@paytm)
  payeeName: string;     // Recipient name
  amountInRupees: number; // Amount in INR (rupees)
  txnNote?: string;      // Transaction note/reference
  txnRefId?: string;     // Optional transaction reference ID
}

/**
 * Builds a UPI intent URL for payment apps
 * @example
 * buildUpiUri({ payeeVpa: "john@upi", payeeName: "John Doe", amountInRupees: 500 })
 * // Returns: upi://pay?pa=john@upi&pn=John%20Doe&am=500.00&cu=INR
 */
export function buildUpiUri(params: UpiPaymentParams): string {
  const { payeeVpa, payeeName, amountInRupees, txnNote, txnRefId } = params;

  // Validate inputs
  if (!payeeVpa || !payeeVpa.includes("@")) {
    throw new Error("Invalid UPI VPA format");
  }
  if (amountInRupees <= 0) {
    throw new Error("Amount must be positive");
  }
  if (amountInRupees > 100000) {
    throw new Error("Amount exceeds UPI transaction limit");
  }

  const queryParams = new URLSearchParams();
  
  // Required parameters
  queryParams.set("pa", payeeVpa);
  queryParams.set("pn", payeeName);
  queryParams.set("am", amountInRupees.toFixed(2));
  queryParams.set("cu", "INR");
  
  // Optional parameters
  if (txnNote) {
    queryParams.set("tn", txnNote);
  }
  if (txnRefId) {
    queryParams.set("tr", txnRefId);
  }

  return `upi://pay?${queryParams.toString()}`;
}

/**
 * Convert paise to rupees
 */
export function paiseToRupees(paise: number): number {
  return paise / 100;
}

/**
 * Convert rupees to paise
 */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/**
 * Format currency for display
 */
export function formatCurrency(paise: number): string {
  const rupees = paiseToRupees(paise);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rupees);
}

/**
 * Generate a unique transaction reference
 */
export function generateTxnRef(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `QD${timestamp}${random}`.toUpperCase();
}

/**
 * Build a complete payment URL with all QuietDen metadata
 */
export function buildVouchPaymentUri(params: {
  payeeVpa: string;
  payeeName: string;
  amountPaise: number;
  groupName?: string;
  rules?: string[];
}): string {
  const { payeeVpa, payeeName, amountPaise, groupName, rules } = params;
  
  let txnNote = "Vouch";
  if (groupName) {
    txnNote += ` - ${groupName}`;
  }
  if (rules && rules.length > 0) {
    const rulesSummary = rules.slice(0, 2).join(", ");
    txnNote += ` (${rulesSummary}${rules.length > 2 ? "..." : ""})`;
  }
  
  // UPI note max length is typically 50 chars
  txnNote = txnNote.substring(0, 50);

  return buildUpiUri({
    payeeVpa,
    payeeName,
    amountInRupees: paiseToRupees(amountPaise),
    txnNote,
    txnRefId: generateTxnRef(),
  });
}
