import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { id } from 'date-fns/locale';
import { FileText, Download } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

interface Transaction {
  id: string;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  created_at: string;
}

const Reports = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, [period]);

  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'week':
        return { start: startOfWeek(now, { locale: id }), end: endOfWeek(now, { locale: id }) };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const { start, end } = getDateRange();

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Gagal memuat laporan');
    } finally {
      setLoading(false);
    }
  };

  const getTotalRevenue = () => {
    return transactions
      .filter(t => t.payment_status === 'paid')
      .reduce((sum, t) => sum + Number(t.total_amount), 0);
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    const { start, end } = getDateRange();
    
    doc.setFontSize(18);
    doc.text('Laporan Penjualan', 14, 20);
    
    doc.setFontSize(12);
    doc.text(`Periode: ${format(start, 'dd MMM yyyy', { locale: id })} - ${format(end, 'dd MMM yyyy', { locale: id })}`, 14, 30);
    doc.text(`Total Transaksi: ${transactions.length}`, 14, 40);
    doc.text(`Total Pendapatan: Rp ${getTotalRevenue().toLocaleString('id-ID')}`, 14, 50);
    
    let yPos = 70;
    doc.setFontSize(10);
    doc.text('Detail Transaksi:', 14, yPos);
    yPos += 10;
    
    transactions.forEach((trans, index) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      
      const text = `${index + 1}. ${format(new Date(trans.created_at), 'dd/MM/yyyy HH:mm')} - Rp ${Number(trans.total_amount).toLocaleString('id-ID')} (${trans.payment_method})`;
      doc.text(text, 14, yPos);
      yPos += 7;
    });
    
    doc.save(`laporan-${period}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('Laporan berhasil diunduh');
  };

  const periodLabels = {
    today: 'Hari Ini',
    week: 'Minggu Ini',
    month: 'Bulan Ini',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gradient mb-2">Laporan</h1>
          <p className="text-muted-foreground">Laporan penjualan dan transaksi</p>
        </div>
        
        <Button onClick={downloadPDF} className="gradient-success">
          <Download className="h-4 w-4 mr-2" />
          Unduh PDF
        </Button>
      </div>

      <div className="flex gap-2">
        {(['today', 'week', 'month'] as const).map((p) => (
          <Button
            key={p}
            variant={period === p ? 'default' : 'outline'}
            onClick={() => setPeriod(p)}
            className={period === p ? 'gradient-primary' : ''}
          >
            {periodLabels[p]}
          </Button>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Transaksi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{transactions.length}</div>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Pendapatan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gradient">
              Rp {getTotalRevenue().toLocaleString('id-ID')}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Transaksi Sukses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">
              {transactions.filter(t => t.payment_status === 'paid').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Detail Transaksi
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Memuat...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Tidak ada transaksi di periode ini
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((trans) => (
                <div
                  key={trans.id}
                  className="flex items-center justify-between p-4 rounded-xl glass-card border border-border/30"
                >
                  <div className="space-y-1">
                    <p className="font-medium">
                      Rp {Number(trans.total_amount).toLocaleString('id-ID')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(trans.created_at), 'dd MMMM yyyy, HH:mm', { locale: id })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      trans.payment_method === 'qris'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-success/10 text-success'
                    }`}>
                      {trans.payment_method.toUpperCase()}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      trans.payment_status === 'paid'
                        ? 'bg-success/10 text-success'
                        : 'bg-yellow-500/10 text-yellow-600'
                    }`}>
                      {trans.payment_status === 'paid' ? 'Lunas' : 'Pending'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
