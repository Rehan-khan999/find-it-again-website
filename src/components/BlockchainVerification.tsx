import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Shield, ShieldCheck, ExternalLink, Hash } from 'lucide-react';
import { verifyItemOnBlockchain, getItemVerifications } from '@/services/blockchainService';

interface BlockchainVerificationProps {
  itemId: string;
  isOwner: boolean;
}

export const BlockchainVerification: React.FC<BlockchainVerificationProps> = ({ 
  itemId, 
  isOwner 
}) => {
  const [loading, setLoading] = useState(false);
  const [verifications, setVerifications] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadVerifications();
  }, [itemId]);

  const loadVerifications = async () => {
    const { data, error } = await getItemVerifications(itemId);
    if (error) {
      console.error('Error loading verifications:', error);
    } else {
      setVerifications(data || []);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    try {
      const result = await verifyItemOnBlockchain(itemId);
      
      if (result.success) {
        toast({
          title: "Verification Successful!",
          description: `Item verified on blockchain. Hash: ${result.blockchainHash?.slice(0, 16)}...`
        });
        await loadVerifications();
      } else {
        toast({
          title: "Verification Failed",
          description: result.error,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Verification Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const hasVerification = verifications.length > 0;
  const latestVerification = verifications[0];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {hasVerification ? (
            <ShieldCheck className="h-5 w-5 text-green-600" />
          ) : (
            <Shield className="h-5 w-5 text-gray-400" />
          )}
          Blockchain Verification
        </CardTitle>
        <CardDescription>
          {hasVerification 
            ? "This item has been verified and anchored on the blockchain"
            : "Verify ownership and authenticity using blockchain technology"
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasVerification && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                <ShieldCheck className="h-3 w-3 mr-1" />
                Verified
              </Badge>
              <span className="text-sm text-muted-foreground">
                {new Date(latestVerification.verified_at).toLocaleDateString()}
              </span>
            </div>
            
            <div className="bg-gray-50 p-3 rounded-md space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Hash className="h-4 w-4" />
                <span className="font-medium">Blockchain Hash:</span>
              </div>
              <code className="text-xs break-all bg-white p-2 rounded border">
                {latestVerification.blockchain_hash}
              </code>
            </div>

            {latestVerification.transaction_hash && (
              <div className="flex items-center gap-2 text-sm">
                <ExternalLink className="h-4 w-4" />
                <span>Transaction: </span>
                <code className="text-xs">{latestVerification.transaction_hash}</code>
              </div>
            )}

            {latestVerification.block_number && (
              <div className="text-sm">
                <span className="font-medium">Block Number: </span>
                <code>{latestVerification.block_number.toLocaleString()}</code>
              </div>
            )}
          </div>
        )}

        {isOwner && !hasVerification && (
          <div className="text-center pt-4">
            <Button 
              onClick={handleVerify}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Verifying...' : 'Verify on Blockchain'}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              This will create a cryptographic proof of ownership and timestamp
            </p>
          </div>
        )}

        {!hasVerification && !isOwner && (
          <div className="text-center text-muted-foreground">
            <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">This item has not been blockchain verified</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};