import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, ShoppingBag, TrendingUp, Package } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface Stats {
  todayTransactions: number;
  todayRevenue: number;
  totalProducts: number;
  recentTransactions: any[];
}

const Dashboard = () => {
  const [stats, setStats] = useState<Stats>({
    todayTransactions: 0,
    todayRevenue: 0,
    totalProducts: 0,
    recentTransactions: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Fetch today's transactions
      const { data: transactions, error: transError } = await supabase
        .from('transactions')
        .select('*')
        .eq('payment_status', 'paid')
        .gte('created_at', today.toISOString());

      if (transError) throw transError;

      // Fetch total products
      const { count: productCount, error: prodError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      if (prodError) throw prodError;

      // Fetch recent transactions
      const { data: recentTrans, error: recentError } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentError) throw recentError;

      const todayRevenue = transactions?.reduce((sum, t) => sum + Number(t.total_amount), 0) || 0;

      setStats({
        todayTransactions: transactions?.length || 0,
        todayRevenue,
        totalProducts: productCount || 0,
        recentTransactions: recentTrans || [],
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Transaksi Hari Ini',
      value: stats.todayTransactions,
      icon: ShoppingBag,
      gradient: 'gradient-primary',
    },
    {
      title: 'Pendapatan Hari Ini',
      value: `Rp ${stats.todayRevenue.toLocaleString('id-ID')}`,
      icon: DollarSign,
      gradient: 'gradient-success',
    },
    {
      title: 'Total Produk',
      value: stats.totalProducts,
      icon: Package,
      gradient: 'gradient-primary',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-gradient mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Selamat datang di sistem POS Kasir</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {statCards.map((stat, index) => (
          <Card
            key={stat.title}
            className="glass-card border-border/50 hover:shadow-lg transition-all animate-fade-in-up"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", stat.gradient)}>
                <stat.icon className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Transactions */}
      <Card className="glass-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Transaksi Terbaru
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.recentTransactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Belum ada transaksi</p>
            ) : (
              stats.recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 rounded-xl glass-card border border-border/30 hover:border-primary/30 transition-all"
                >
                  <div className="space-y-1">
                    <p className="font-medium">
                      Rp {Number(transaction.total_amount).toLocaleString('id-ID')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(transaction.created_at), 'dd MMMM yyyy, HH:mm', { locale: id })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium",
                      transaction.payment_method === 'qris' 
                        ? "bg-primary/10 text-primary"
                        : "bg-success/10 text-success"
                    )}>
                      {transaction.payment_method.toUpperCase()}
                    </span>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium",
                      transaction.payment_status === 'paid'
                        ? "bg-success/10 text-success"
                        : "bg-yellow-500/10 text-yellow-600"
                    )}>
                      {transaction.payment_status === 'paid' ? 'Lunas' : 'Pending'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}

export default Dashboard;
