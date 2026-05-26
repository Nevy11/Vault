import crypto from 'crypto';
import { Request, Response } from 'express';
import { supabase } from '@/api/supabase'; // Assuming shared supabase client or DB pool

/**
 * TYPES
 */
export interface LedgerInsightsResponse {
  metrics: {
    totalInflow: number;
    totalOutflow: number;
    netPosition: number;
    activityVolume: number;
    currentBalance: number;
  };
  audit: {
    verifiedEntries: number;
    tamperedEntries: number;
    isSystemIntegrityValid: boolean;
  };
}

/**
 * Audit Check Helper
 * Verifies that the cryptographic signature matches the entry data.
 */
const verifyLedgerSignature = (entry: any): boolean => {
  const secret = process.env.LEDGER_SIGNING_SECRET || 'fallback-secret';
  const data = `${entry.user_id}${entry.type}${entry.amount}${entry.created_at}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');
  
  return entry.cryptographic_signature === expectedSignature;
};

/**
 * BACKEND CONTROLLER
 * GET /api/v1/vault/ledger-insights
 */
export const getLedgerInsights = async (req: Request, res: Response) => {
  try {
    // 1. Identification via Authenticated User (from JWT Middleware)
    const userId = (req as any).user?.id; 
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // 2. Fetch all entries for audit and aggregation
    // Note: In extremely high volume, you'd aggregate in SQL and sample signatures
    const { data: entries, error } = await supabase
      .from('ledger_entries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // 3. Perform Aggregation & Zero-Trust Audit
    let totalInflow = 0;
    let totalOutflow = 0;
    let tamperedEntries = 0;

    entries?.forEach((entry) => {
      // Cryptographic Integrity Check
      if (!verifyLedgerSignature(entry)) {
        tamperedEntries++;
        return; // Skip tampered entries from financial totals
      }

      const val = parseFloat(entry.amount);
      if (entry.type === 'INFLOW') {
        totalInflow += val;
      } else {
        totalOutflow += val;
      }
    });

    // 4. Critical Security Failure if tampering detected
    if (tamperedEntries > 0) {
      console.error(`CRITICAL: ${tamperedEntries} tampered ledger entries detected for user ${userId}`);
    }

    const netPosition = totalInflow - totalOutflow;

    const response: LedgerInsightsResponse = {
      metrics: {
        totalInflow,
        totalOutflow,
        netPosition,
        activityVolume: (entries?.length || 0) - tamperedEntries,
        currentBalance: netPosition, // In a true ledger, this reflects total state
      },
      audit: {
        verifiedEntries: (entries?.length || 0) - tamperedEntries,
        tamperedEntries,
        isSystemIntegrityValid: tamperedEntries === 0,
      }
    };

    return res.status(200).json(response);
  } catch (err: any) {
    console.error('Ledger Insights Error:', err);
    return res.status(500).json({ error: 'Internal server error calculating ledger insights' });
  }
};
