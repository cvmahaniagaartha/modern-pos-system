import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Camera, X } from 'lucide-react';
import { toast } from 'sonner';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

const BarcodeScanner = ({ onScan, onClose }: BarcodeScannerProps) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    startScanner();
    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    try {
      const html5QrCode = new Html5Qrcode("barcode-reader");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          onScan(decodedText);
          toast.success(`Barcode terdeteksi: ${decodedText}`);
        },
        (errorMessage) => {
          // Ignore scan errors
        }
      );
      
      setScanning(true);
    } catch (err) {
      console.error("Error starting scanner:", err);
      toast.error("Gagal mengakses kamera");
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && scanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <Card className="w-full max-w-md glass-card border-border/50">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Scan Barcode</h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                stopScanner();
                onClose();
              }}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          <div id="barcode-reader" className="rounded-xl overflow-hidden" />
          
          <p className="text-sm text-muted-foreground text-center">
            Arahkan kamera ke barcode produk
          </p>
        </div>
      </Card>
    </div>
  );
};

export default BarcodeScanner;
