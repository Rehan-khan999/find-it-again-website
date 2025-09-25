
import { Link } from "react-router-dom";
import { Search, MapPin, Users, Shield, Plus, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from 'react-i18next';

const Index = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  // Fetch recent items for preview
  const { data: recentItems = [] } = useQuery({
    queryKey: ['recent-items'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('items')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(6);
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const [lostItems, foundItems, returnedItems] = await Promise.all([
        (supabase as any).from('items').select('id', { count: 'exact' }).eq('item_type', 'lost').eq('status', 'active'),
        (supabase as any).from('items').select('id', { count: 'exact' }).eq('item_type', 'found').eq('status', 'active'),
        (supabase as any).from('items').select('id', { count: 'exact' }).eq('status', 'returned')
      ]);
      
      return {
        lost: lostItems.count || 0,
        found: foundItems.count || 0,
        returned: returnedItems.count || 0
      };
    }
  });

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary/10 to-primary/20 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            {t('labels.lostSomething')} <br />
            <span className="text-primary">{t('labels.helpYouFind')}</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            {t('labels.connectCommunity')}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <>
                <Button asChild size="lg">
                  <Link to="/post-lost">
                    <Plus className="w-5 h-5 mr-2" />
                    {t('nav.postLost')}
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/post-found">
                    <Search className="w-5 h-5 mr-2" />
                    {t('nav.postFound')}
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild size="lg">
                  <Link to="/auth">{t('buttons.getStarted')}</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/browse">
                    <Eye className="w-5 h-5 mr-2" />
                    {t('buttons.browseItems')}
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats Section */}
      {stats && (
        <div className="py-16 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold text-primary mb-2">{stats.lost}</div>
                <div className="text-muted-foreground">{t('labels.activeLostItems')}</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-emerald-600 mb-2">{stats.found}</div>
                <div className="text-muted-foreground">{t('labels.itemsFound')}</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-purple-600 mb-2">{stats.returned}</div>
                <div className="text-muted-foreground">{t('labels.successfullyReturned')}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Features Section */}
      <div className="py-20 bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">{t('labels.howItWorks')}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t('labels.platformEasy')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardHeader>
                <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-primary" />
                </div>
                <CardTitle>{t('labels.reportSearch')}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  {t('labels.reportDescription')}
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardHeader>
                <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-8 h-8 text-emerald-600" />
                </div>
                <CardTitle>{t('labels.smartMatching')}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  {t('labels.matchingDescription')}
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardHeader>
                <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-purple-600" />
                </div>
                <CardTitle>{t('labels.safeReunion')}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  {t('labels.reunionDescription')}
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Recent Items Preview */}
      {recentItems.length > 0 && (
        <div className="py-20 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center mb-12">
              <div>
                <h2 className="text-3xl font-bold text-foreground mb-2">{t('labels.recentItems')}</h2>
                <p className="text-muted-foreground">{t('labels.recentDescription')}</p>
              </div>
              <Button asChild variant="outline">
                <Link to="/browse">{t('buttons.viewAllItems')}</Link>
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentItems.slice(0, 3).map((item) => (
                <Card key={item.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg line-clamp-1">{item.title}</CardTitle>
                      <Badge variant={item.item_type === 'lost' ? 'destructive' : 'default'}>
                        {item.item_type === 'lost' ? 'LOST' : 'FOUND'}
                      </Badge>
                    </div>
                    <Badge variant="outline" className="w-fit">{item.category}</Badge>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="line-clamp-3 mb-4">
                      {item.description}
                    </CardDescription>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4 mr-1" />
                      <span className="line-clamp-1">{item.location}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CTA Section */}
      <div className="py-20 bg-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">
            {t('labels.readyToHelp')}
          </h2>
          <p className="text-primary-foreground/80 mb-8 text-lg">
            {t('labels.joinThousands')}
          </p>
          
          {!user && (
            <Button asChild size="lg" variant="secondary">
              <Link to="/auth">{t('buttons.signUpNow')}</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
