import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { X, Check, Loader2 } from 'lucide-react';
import QRCode from 'qrcode';

interface PaymentQRISProps {
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}

const PaymentQRIS = ({ amount, onSuccess, onCancel }: PaymentQRISProps) => {
  const [qrCode, setQrCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    generateQR();
    
    // Simulate payment checking
    const interval = setInterval(() => {
      setChecking(true);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (checking && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (checking && countdown === 0) {
      // Simulate successful payment
      onSuccess();
    }
  }, [checking, countdown]);

  const generateQR = async () => {
    try {
      // In production, this would be a real QRIS payload
      const qrisPayload = `00020101021226610014ID.CO.QRIS.WWW0118ID${Date.now()}52045812530336054${amount.toFixed(2).replace('.', '')}5802ID5913Merchant Name6007Jakarta61051234062410114${Date.now()}6304`;
      
      const qr = await QRCode.toDataURL(qrisPayload, {
        width: 300,
        margin: 2,
      });
      
      setQrCode(qr);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <Card className="w-full max-w-md glass-card border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Pembayaran QRIS</CardTitle>
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-gradient mb-2">
              Rp {amount.toLocaleString('id-ID')}
            </p>
            <p className="text-sm text-muted-foreground">
              Scan QR code dengan aplikasi e-wallet
            </p>
          </div>

          {qrCode && (
            <div className="flex justify-center p-6 bg-white rounded-2xl">
              <img src={qrCode} alt="QRIS Code" className="w-64 h-64" />
            </div>
          )}

          {checking ? (
            <div className="text-center space-y-3">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full gradient-success flex items-center justify-center animate-pulse-glow">
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                </div>
              </div>
              <p className="font-medium text-success">
                Menunggu pembayaran... ({countdown}s)
              </p>
              <p className="text-sm text-muted-foreground">
                Mohon selesaikan pembayaran di aplikasi e-wallet Anda
              </p>
            </div>
          ) : (
            <div className="text-center space-y-2">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center animate-pulse-glow">
                  <Check className="h-8 w-8 text-white" />
                </div>
              </div>
              <p className="font-medium">Menunggu pembayaran...</p>
              <p className="text-sm text-muted-foreground">
                Scan QR code untuk melanjutkan
              </p>
            </div>
          )}

          <Button
            variant="outline"
            onClick={onCancel}
            className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
          >
            Batalkan Pembayaran
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentQRIS;
