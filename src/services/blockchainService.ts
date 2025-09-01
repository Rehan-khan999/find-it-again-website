import { supabase } from '@/integrations/supabase/client';

export interface BlockchainVerificationResult {
  success: boolean;
  verification?: any;
  blockchainHash?: string;
  transactionHash?: string;
  blockNumber?: number;
  error?: string;
}

export const verifyItemOnBlockchain = async (
  itemId: string, 
  verificationData?: any
): Promise<BlockchainVerificationResult> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to verify items');
    }

    const { data, error } = await supabase.functions.invoke('blockchain-verify', {
      body: {
        itemId,
        userId: user.id,
        verificationData: verificationData || {}
      }
    });

    if (error) {
      console.error('Blockchain verification error:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      verification: data.verification,
      blockchainHash: data.blockchainHash,
      transactionHash: data.transactionHash,
      blockNumber: data.blockNumber
    };
  } catch (error: any) {
    console.error('Blockchain verification error:', error);
    return { success: false, error: error.message };
  }
};

export const getItemVerifications = async (itemId: string) => {
  try {
    const { data, error } = await supabase
      .from('verifications')
      .select('*')
      .eq('item_id', itemId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    console.error('Error fetching verifications:', error);
    return { data: null, error: error.message };
  }
};