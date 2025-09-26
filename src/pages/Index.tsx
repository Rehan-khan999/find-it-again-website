import { Link, useNavigate } from "react-router-dom";
import { Search, MapPin, Users, Shield, Plus, Eye, Zap, Heart, Target, UserPlus, Bell, MessageCircle, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from 'react-i18next';

export default function Index() {
  const navigate = useNavigate();
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

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Particle Background Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-2 h-2 bg-primary/30 rounded-full top-1/4 left-1/4 animate-float"></div>
        <div className="absolute w-1 h-1 bg-accent/40 rounded-full top-3/4 right-1/4 animate-float animation-delay-1000"></div>
        <div className="absolute w-3 h-3 bg-info/20 rounded-full top-1/2 right-1/3 animate-float animation-delay-2000"></div>
      </div>

      {/* Hero Section */}
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-pulse-glow"></div>
          <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse-glow animation-delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-primary/10 to-accent/10 rounded-full blur-3xl animate-float"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="glass-card p-8 md:p-16 rounded-3xl shadow-elegant backdrop-blur-3xl border border-primary/20">
            <h1 className="text-6xl md:text-8xl font-cyber font-black mb-6 animate-fade-in">
              <span className="text-gradient animate-cyber-flicker">Find</span>
              <span className="text-primary">It</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed animate-fade-in-up">
              {t('hero.subtitle')} <span className="text-neon font-semibold">AI-powered matching</span> and <span className="text-neon font-semibold">blockchain verification</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12 animate-scale-in">
              {user ? (
                <>
                  <Button
                    size="lg"
                    onClick={() => navigate('/post-lost')}
                    className="btn-cyber text-lg px-8 py-4 font-cyber font-semibold hover-lift"
                  >
                    <Search className="mr-3 h-6 w-6" />
                    {t('buttons.reportLost')}
                  </Button>
                  <Button
                    size="lg"
                    variant="secondary"
                    onClick={() => navigate('/post-found')}
                    className="glass-effect border-primary/30 text-lg px-8 py-4 font-cyber font-semibold hover-glow"
                  >
                    <MapPin className="mr-3 h-6 w-6" />
                    {t('buttons.reportFound')}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="lg"
                    onClick={() => navigate('/auth')}
                    className="btn-cyber text-lg px-8 py-4 font-cyber font-semibold hover-lift"
                  >
                    <UserPlus className="mr-3 h-6 w-6" />
                    {t('buttons.getStarted')}
                  </Button>
                  <Button
                    size="lg"
                    variant="secondary"
                    onClick={() => navigate('/browse')}
                    className="glass-effect border-primary/30 text-lg px-8 py-4 font-cyber font-semibold hover-glow"
                  >
                    <Search className="mr-3 h-6 w-6" />
                    {t('buttons.browse')}
                  </Button>
                </>
              )}
            </div>

            {/* Floating Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-slideInLeft">
              {[
                { label: t('stats.itemsReunited'), value: '25,847', icon: Heart },
                { label: t('stats.activeUsers'), value: '150K+', icon: Users },
                { label: t('stats.successRate'), value: '94%', icon: Target }
              ].map((stat, index) => (
                <div 
                  key={stat.label}
                  className="glass-card p-6 rounded-2xl border border-primary/20 hover-lift"
                  style={{ animationDelay: `${index * 200}ms` }}
                >
                  <stat.icon className="h-8 w-8 text-primary mx-auto mb-3 animate-float" />
                  <div className="text-3xl font-cyber font-bold text-gradient mb-2">{stat.value}</div>
                  <div className="text-muted-foreground text-sm font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-4xl md:text-5xl font-cyber font-bold mb-6">
              <span className="text-gradient">Next-Gen</span> <span className="text-neon">Features</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {t('features.title')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Zap,
                title: t('features.aiMatching.title'),
                description: t('features.aiMatching.description'),
                gradient: 'from-primary to-accent'
              },
              {
                icon: Shield,
                title: t('features.blockchainVerification.title'),
                description: t('features.blockchainVerification.description'),
                gradient: 'from-accent to-success'
              },
              {
                icon: MapPin,
                title: t('features.smartLocation.title'),
                description: t('features.smartLocation.description'),
                gradient: 'from-success to-info'
              },
              {
                icon: MessageCircle,
                title: t('features.secureMessaging.title'),
                description: t('features.secureMessaging.description'),
                gradient: 'from-info to-warning'
              },
              {
                icon: Camera,
                title: t('features.photoRecognition.title'),
                description: t('features.photoRecognition.description'),
                gradient: 'from-warning to-destructive'
              },
              {
                icon: Bell,
                title: t('features.realTimeAlerts.title'),
                description: t('features.realTimeAlerts.description'),
                gradient: 'from-destructive to-primary'
              }
            ].map((feature, index) => (
              <div
                key={feature.title}
                className="group relative glass-card p-8 rounded-3xl border border-primary/20 hover-lift"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                {/* Glowing background effect */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-5 rounded-3xl group-hover:opacity-10 transition-opacity duration-500`}></div>
                
                {/* Content */}
                <div className="relative z-10">
                  <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${feature.gradient} mb-6 shadow-glow group-hover:shadow-cyber transition-all duration-500`}>
                    <feature.icon className="h-8 w-8 text-white animate-float" />
                  </div>
                  
                  <h3 className="text-xl font-cyber font-bold text-foreground mb-4 group-hover:text-neon transition-colors duration-300">
                    {feature.title}
                  </h3>
                  
                  <p className="text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors duration-300">
                    {feature.description}
                  </p>
                </div>

                {/* Hover effect overlay */}
                <div className="absolute inset-0 rounded-3xl border-2 border-primary/0 group-hover:border-primary/30 transition-colors duration-500"></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Items Preview */}
      {recentItems.length > 0 && (
        <div className="py-20 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center mb-16 animate-fade-in">
              <div>
                <h2 className="text-4xl font-cyber font-bold mb-3">
                  <span className="text-gradient">Recent</span> <span className="text-neon">Items</span>
                </h2>
                <p className="text-xl text-muted-foreground">{t('labels.recentDescription')}</p>
              </div>
              <Button asChild variant="secondary" className="glass-effect border-primary/30 hover-glow px-6 py-3 text-base font-cyber font-semibold">
                <Link to="/browse">{t('buttons.viewAllItems')}</Link>
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {recentItems.slice(0, 3).map((item, index) => (
                <Card key={item.id} className="group glass-card border border-primary/20 hover-lift" style={{ animationDelay: `${index * 150}ms` }}>
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between mb-3">
                      <CardTitle className="text-xl font-cyber font-semibold line-clamp-1 group-hover:text-neon transition-colors">{item.title}</CardTitle>
                      <Badge variant={item.item_type === 'lost' ? 'destructive' : 'default'} className="shadow-soft font-cyber">
                        {item.item_type === 'lost' ? 'LOST' : 'FOUND'}
                      </Badge>
                    </div>
                    <Badge variant="outline" className="w-fit border-primary/30 font-cyber">{item.category}</Badge>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="line-clamp-3 mb-6 text-base leading-relaxed">
                      {item.description}
                    </CardDescription>
                    <div className="flex items-center text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                      <MapPin className="w-4 h-4 mr-2 text-primary" />
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
      <div className="py-20 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/10 via-transparent to-accent/10"></div>
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-pulse-glow"></div>
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-accent/20 rounded-full blur-3xl animate-pulse-glow"></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <div className="glass-card p-12 rounded-3xl border border-primary/20 shadow-elegant backdrop-blur-3xl">
            <h2 className="text-4xl md:text-5xl font-cyber font-bold mb-6 animate-fade-in">
              <span className="text-gradient animate-cyber-flicker">Ready to Reunite</span> <br/>
              <span className="text-neon">with Your Items?</span>
            </h2>
            
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-in-up">
              {t('cta.description')}
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center animate-scale-in">
              {!user ? (
                <>
                  <Button
                    size="lg"
                    onClick={() => navigate('/auth')}
                    className="btn-cyber text-lg px-10 py-4 font-cyber font-bold hover-lift"
                  >
                    <UserPlus className="mr-3 h-6 w-6" />
                    {t('buttons.joinToday')}
                  </Button>
                  <Button
                    size="lg"
                    variant="secondary"
                    onClick={() => navigate('/guest-post/lost')}
                    className="glass-effect border-primary/30 text-lg px-10 py-4 font-cyber font-semibold hover-glow"
                  >
                    <Search className="mr-3 h-6 w-6" />
                    {t('buttons.postAsGuest')}
                  </Button>
                </>
              ) : (
                <Button
                  size="lg"
                  onClick={() => navigate('/browse')}
                  className="btn-cyber text-lg px-10 py-4 font-cyber font-bold hover-lift"
                >
                  <Search className="mr-3 h-6 w-6" />
                  {t('buttons.startSearching')}
                </Button>
              )}
            </div>

            {/* Trust Indicators */}
            <div className="mt-12 pt-8 border-t border-primary/20">
              <div className="flex flex-col md:flex-row justify-center items-center gap-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 hover-neon">
                  <Shield className="h-5 w-5" />
                  <span className="font-semibold">{t('trust.secure')}</span>
                </div>
                <div className="flex items-center gap-2 hover-neon">
                  <Users className="h-5 w-5" />
                  <span className="font-semibold">{t('trust.trusted')}</span>
                </div>
                <div className="flex items-center gap-2 hover-neon">
                  <Zap className="h-5 w-5" />
                  <span className="font-semibold">{t('trust.fast')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}