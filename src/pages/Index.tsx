
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
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-primary/10 to-accent/15 py-20 lg:py-32">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="absolute top-1/4 -left-4 w-72 h-72 bg-primary/20 rounded-full mix-blend-multiply filter blur-xl animate-float"></div>
        <div className="absolute top-1/3 -right-4 w-72 h-72 bg-accent/20 rounded-full mix-blend-multiply filter blur-xl animate-float" style={{ animationDelay: '2s' }}></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="animate-fade-in-up">
            <h1 className="text-5xl md:text-7xl font-display font-bold text-foreground mb-6 leading-tight">
              {t('labels.lostSomething')} <br />
              <span className="text-gradient animate-gradient">{t('labels.helpYouFind')}</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-4xl mx-auto leading-relaxed font-light">
              {t('labels.connectCommunity')}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
            {user ? (
              <>
                <Button asChild size="lg" className="shadow-elegant hover:shadow-glow transition-all duration-300 transform hover:scale-105 px-8 py-4 text-lg font-semibold">
                  <Link to="/post-lost">
                    <Plus className="w-5 h-5 mr-2" />
                    {t('nav.postLost')}
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="glass-effect hover:shadow-soft transition-all duration-300 transform hover:scale-105 px-8 py-4 text-lg font-semibold border-2 hover:border-primary/50">
                  <Link to="/post-found">
                    <Search className="w-5 h-5 mr-2" />
                    {t('nav.postFound')}
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild size="lg" className="shadow-elegant hover:shadow-glow transition-all duration-300 transform hover:scale-105 px-8 py-4 text-lg font-semibold">
                  <Link to="/auth">{t('buttons.getStarted')}</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="glass-effect hover:shadow-soft transition-all duration-300 transform hover:scale-105 px-8 py-4 text-lg font-semibold border-2 hover:border-primary/50">
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
        <div className="py-20 bg-background relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div className="animate-fade-in group" style={{ animationDelay: '0.1s' }}>
                <div className="bg-card rounded-2xl p-8 shadow-soft hover:shadow-elegant transition-all duration-300 group-hover:scale-105 border border-border/50">
                  <div className="text-5xl font-display font-bold text-primary mb-3">{stats.lost}</div>
                  <div className="text-muted-foreground text-lg font-medium">{t('labels.activeLostItems')}</div>
                </div>
              </div>
              <div className="animate-fade-in group" style={{ animationDelay: '0.2s' }}>
                <div className="bg-card rounded-2xl p-8 shadow-soft hover:shadow-elegant transition-all duration-300 group-hover:scale-105 border border-border/50">
                  <div className="text-5xl font-display font-bold text-emerald-600 mb-3">{stats.found}</div>
                  <div className="text-muted-foreground text-lg font-medium">{t('labels.itemsFound')}</div>
                </div>
              </div>
              <div className="animate-fade-in group" style={{ animationDelay: '0.3s' }}>
                <div className="bg-card rounded-2xl p-8 shadow-soft hover:shadow-elegant transition-all duration-300 group-hover:scale-105 border border-border/50">
                  <div className="text-5xl font-display font-bold text-purple-600 mb-3">{stats.returned}</div>
                  <div className="text-muted-foreground text-lg font-medium">{t('labels.successfullyReturned')}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Features Section */}
      <div className="py-24 bg-muted/30 relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full filter blur-3xl"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20 animate-fade-in-up">
            <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-6">{t('labels.howItWorks')}</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              {t('labels.platformEasy')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center group hover:shadow-elegant transition-all duration-300 hover:scale-105 animate-fade-in border-border/50 bg-card/80 backdrop-blur-sm" style={{ animationDelay: '0.1s' }}>
              <CardHeader className="pb-4">
                <div className="bg-gradient-to-br from-primary/20 to-primary/10 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-soft">
                  <Search className="w-10 h-10 text-primary" />
                </div>
                <CardTitle className="text-xl font-display font-semibold">{t('labels.reportSearch')}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  {t('labels.reportDescription')}
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card className="text-center group hover:shadow-elegant transition-all duration-300 hover:scale-105 animate-fade-in border-border/50 bg-card/80 backdrop-blur-sm" style={{ animationDelay: '0.2s' }}>
              <CardHeader className="pb-4">
                <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-600/10 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-soft">
                  <MapPin className="w-10 h-10 text-emerald-600" />
                </div>
                <CardTitle className="text-xl font-display font-semibold">{t('labels.smartMatching')}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  {t('labels.matchingDescription')}
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card className="text-center group hover:shadow-elegant transition-all duration-300 hover:scale-105 animate-fade-in border-border/50 bg-card/80 backdrop-blur-sm" style={{ animationDelay: '0.3s' }}>
              <CardHeader className="pb-4">
                <div className="bg-gradient-to-br from-purple-600/20 to-purple-600/10 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-soft">
                  <Users className="w-10 h-10 text-purple-600" />
                </div>
                <CardTitle className="text-xl font-display font-semibold">{t('labels.safeReunion')}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  {t('labels.reunionDescription')}
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Recent Items Preview */}
      {recentItems.length > 0 && (
        <div className="py-24 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center mb-16 animate-fade-in-up">
              <div>
                <h2 className="text-4xl font-display font-bold text-foreground mb-3">{t('labels.recentItems')}</h2>
                <p className="text-xl text-muted-foreground">{t('labels.recentDescription')}</p>
              </div>
              <Button asChild variant="outline" className="glass-effect hover:shadow-soft transition-all duration-300 px-6 py-3 text-base font-semibold border-2 hover:border-primary/50">
                <Link to="/browse">{t('buttons.viewAllItems')}</Link>
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {recentItems.slice(0, 3).map((item, index) => (
                <Card key={item.id} className="group hover:shadow-elegant transition-all duration-300 hover:scale-105 animate-fade-in border-border/50 bg-card/90 backdrop-blur-sm" style={{ animationDelay: `${(index + 1) * 0.1}s` }}>
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between mb-3">
                      <CardTitle className="text-xl font-semibold line-clamp-1 group-hover:text-primary transition-colors">{item.title}</CardTitle>
                      <Badge variant={item.item_type === 'lost' ? 'destructive' : 'default'} className="shadow-soft">
                        {item.item_type === 'lost' ? 'LOST' : 'FOUND'}
                      </Badge>
                    </div>
                    <Badge variant="outline" className="w-fit border-border/70">{item.category}</Badge>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="line-clamp-3 mb-6 text-base leading-relaxed">
                      {item.description}
                    </CardDescription>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4 mr-2 text-primary/70" />
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
      <div className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 gradient-hero animate-gradient bg-size-200"></div>
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="animate-fade-in-up">
            <h2 className="text-4xl md:text-5xl font-display font-bold text-primary-foreground mb-6">
              {t('labels.readyToHelp')}
            </h2>
            <p className="text-xl text-primary-foreground/90 mb-12 max-w-3xl mx-auto leading-relaxed">
              {t('labels.joinThousands')}
            </p>
            
            {!user && (
              <Button asChild size="lg" variant="secondary" className="shadow-elegant hover:shadow-glow transition-all duration-300 transform hover:scale-105 px-8 py-4 text-lg font-semibold">
                <Link to="/auth">{t('buttons.signUpNow')}</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
