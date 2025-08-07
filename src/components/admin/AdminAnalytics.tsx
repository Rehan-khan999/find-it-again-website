import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Analytics {
  totalItems: number;
  totalLostItems: number;
  totalFoundItems: number;
  totalUsers: number;
  totalClaims: number;
  recoveryRate: number;
  categoryStats: Array<{ name: string; count: number }>;
  monthlyStats: Array<{ month: string; lost: number; found: number }>;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export const AdminAnalytics = () => {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // Fetch basic counts
        const [itemsResult, usersResult, claimsResult] = await Promise.all([
          supabase.from('items').select('item_type, category, created_at'),
          supabase.from('profiles').select('id'),
          supabase.from('claims').select('status')
        ]);

        const items = itemsResult.data || [];
        const users = usersResult.data || [];
        const claims = claimsResult.data || [];

        const lostItems = items.filter(item => item.item_type === 'lost');
        const foundItems = items.filter(item => item.item_type === 'found');
        const resolvedClaims = claims.filter(claim => claim.status === 'approved');

        // Calculate recovery rate
        const recoveryRate = lostItems.length > 0 ? (resolvedClaims.length / lostItems.length) * 100 : 0;

        // Category statistics
        const categoryCount = items.reduce((acc, item) => {
          acc[item.category] = (acc[item.category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const categoryStats = Object.entries(categoryCount).map(([name, count]) => ({
          name,
          count
        }));

        // Monthly statistics (last 6 months)
        const monthlyData = items.reduce((acc, item) => {
          const month = new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          if (!acc[month]) acc[month] = { lost: 0, found: 0 };
          if (item.item_type === 'lost') acc[month].lost++;
          else acc[month].found++;
          return acc;
        }, {} as Record<string, { lost: number; found: number }>);

        const monthlyStats = Object.entries(monthlyData).map(([month, data]) => ({
          month,
          ...data
        }));

        setAnalytics({
          totalItems: items.length,
          totalLostItems: lostItems.length,
          totalFoundItems: foundItems.length,
          totalUsers: users.length,
          totalClaims: claims.length,
          recoveryRate: Math.round(recoveryRate),
          categoryStats,
          monthlyStats
        });
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-8 bg-muted rounded w-1/2"></div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  if (!analytics) return <div>Failed to load analytics</div>;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalItems}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.totalLostItems} lost, {analytics.totalFoundItems} found
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Recovery Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{analytics.recoveryRate}%</div>
            <p className="text-xs text-muted-foreground">Items successfully reunited</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Registered users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Claims</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalClaims}</div>
            <p className="text-xs text-muted-foreground">Ownership claims</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Activity</CardTitle>
            <CardDescription>Lost vs Found items over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.monthlyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="lost" fill="hsl(var(--destructive))" name="Lost Items" />
                <Bar dataKey="found" fill="hsl(var(--primary))" name="Found Items" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Items by Category</CardTitle>
            <CardDescription>Distribution of item categories</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.categoryStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {analytics.categoryStats.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};