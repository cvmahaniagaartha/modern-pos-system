import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCartStore } from '@/store/useCartStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Camera, Search, Trash2, Plus, Minus, CreditCard, DollarSign } from 'lucide-react';
import BarcodeScanner from '@/components/BarcodeScanner';
import PaymentQRIS from '@/components/PaymentQRIS';
import { cn } from '@/lib/utils';

const Cashier = () => {
  const [showScanner, setShowScanner] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris'>('cash');
  
  const { items, addItem, updateQuantity, removeItem, setDiscount, setTax, clearCart, getSubtotal, getTotal, discount, tax } = useCartStore();

  const searchProduct = async (query: string) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .or(`barcode.eq.${query},name.ilike.%${query}%`)
        .single();

      if (error) throw error;
      
      if (data) {
        addItem({
          productId: data.id,
          name: data.name,
          barcode: data.barcode,
          price: Number(data.price),
          stock: data.stock,
        });
        toast.success(`${data.name} ditambahkan ke keranjang`);
        setSearchQuery('');
      }
    } catch (error: any) {
      toast.error('Produk tidak ditemukan');
    }
  };

  const handleBarcodeScan = async (barcode: string) => {
    await searchProduct(barcode);
    setShowScanner(false);
  };

  const handleCheckout = async () => {
    if (items.length === 0) {
      toast.error('Keranjang masih kosong');
      return;
    }

    if (paymentMethod === 'qris') {
      setShowPayment(true);
    } else {
      await processPayment('paid');
    }
  };

  const processPayment = async (status: 'paid' | 'failed') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: transaction, error: transError } = await supabase
        .from('transactions')
        .insert({
          cashier_id: user.id,
          total_amount: getTotal(),
          payment_method: paymentMethod,
          payment_status: status,
        })
        .select()
        .single();

      if (transError) throw transError;

      const transactionItems = items.map(item => ({
        transaction_id: transaction.id,
        product_id: item.productId,
        qty: item.quantity,
        price: item.price,
      }));

      const { error: itemsError } = await supabase
        .from('transaction_items')
        .insert(transactionItems);

      if (itemsError) throw itemsError;

      // Update stock
      for (const item of items) {
        const { error: stockError } = await supabase
          .from('products')
          .update({ stock: item.stock - item.quantity })
          .eq('id', item.productId);

        if (stockError) throw stockError;
      }

      toast.success('Transaksi berhasil!');
      clearCart();
      setShowPayment(false);
    } catch (error: any) {
      toast.error('Gagal memproses transaksi');
      console.error('Payment error:', error);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-gradient mb-2">Kasir</h1>
        <p className="text-muted-foreground">Kelola transaksi penjualan</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Product Search */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle>Cari Produk</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Scan barcode atau ketik nama produk..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchProduct(searchQuery)}
                    className="glass-card"
                  />
                </div>
                <Button onClick={() => searchProduct(searchQuery)} className="gradient-primary">
                  <Search className="h-4 w-4" />
                </Button>
                <Button onClick={() => setShowScanner(true)} variant="outline" className="border-primary/30">
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Cart Items */}
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle>Keranjang Belanja</CardTitle>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Keranjang masih kosong
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => (
                    <div
                      key={item.productId}
                      className="flex items-center gap-4 p-4 rounded-xl glass-card border border-border/30"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Rp {item.price.toLocaleString('id-ID')}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="h-8 w-8"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-12 text-center font-medium">{item.quantity}</span>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="h-8 w-8"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="text-right">
                        <p className="font-semibold">
                          Rp {(item.price * item.quantity).toLocaleString('id-ID')}
                        </p>
                      </div>
                      
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeItem(item.productId)}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Checkout */}
        <div className="space-y-4">
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle>Total Pembayaran</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">Rp {getSubtotal().toLocaleString('id-ID')}</span>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm">Diskon (Rp)</Label>
                  <Input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="glass-card"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm">Pajak (%)</Label>
                  <Input
                    type="number"
                    value={tax}
                    onChange={(e) => setTax(Number(e.target.value))}
                    className="glass-card"
                  />
                </div>
                
                <div className="pt-4 border-t border-border/30">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Total</span>
                    <span className="text-2xl font-bold text-gradient">
                      Rp {getTotal().toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Metode Pembayaran</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod('cash')}
                    className={cn(
                      "w-full",
                      paymentMethod === 'cash' && "gradient-success"
                    )}
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Cash
                  </Button>
                  <Button
                    variant={paymentMethod === 'qris' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod('qris')}
                    className={cn(
                      "w-full",
                      paymentMethod === 'qris' && "gradient-primary"
                    )}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    QRIS
                  </Button>
                </div>
              </div>
              
              <Button
                onClick={handleCheckout}
                disabled={items.length === 0}
                className="w-full gradient-primary text-lg h-12"
              >
                Bayar Sekarang
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      {showPayment && (
        <PaymentQRIS
          amount={getTotal()}
          onSuccess={() => processPayment('paid')}
          onCancel={() => setShowPayment(false)}
        />
      )}
    </div>
  );
};

export default Cashier;
