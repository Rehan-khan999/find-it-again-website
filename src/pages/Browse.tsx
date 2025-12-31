import { useState, useEffect, useCallback } from "react";
import { Search, Filter, MapPin, Calendar, Tag, Eye, Map, MessageCircle, Sparkles, Info, AlertTriangle, CheckCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DemoListings } from "@/components/DemoListings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ItemDetailsDialog } from "@/components/ItemDetailsDialog";
import { GoogleMap } from "@/components/GoogleMap";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from 'react-i18next';
import VerifiedBadge from "@/components/VerifiedBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { useAITabListener } from "@/hooks/useAITabControl";

interface Item {
  id: string;
  title: string;
  description: string;
  category: string;
  item_type: 'lost' | 'found';
  date_lost_found: string;
  location: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  reward?: string;
  status: string;
  created_at: string;
  latitude?: number;
  longitude?: number;
  verification_questions?: string[];
  user_id: string;
  photos?: string[];
  is_owner_verified?: boolean;
}

interface Category {
  name: string;
}

interface UserVerification {
  [userId: string]: boolean;
}

type ItemTab = 'lost' | 'found';

const Browse = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeTab, setActiveTab] = useState<ItemTab>("lost");
  const [selectedStatus, setSelectedStatus] = useState("active");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [demoMode, setDemoMode] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [userVerifications, setUserVerifications] = useState<UserVerification>({});

  // Listen for AI-triggered tab switches
  const handleAITabSwitch = useCallback((tab: ItemTab) => {
    setActiveTab(tab);
    toast({
      title: `Switched to ${tab === 'lost' ? 'Lost' : 'Found'} Items`,
      description: `AI assistant is searching for matching ${tab === 'lost' ? 'found' : 'lost'} items.`,
    });
  }, [toast]);

  useAITabListener(handleAITabSwitch);

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('categories')
        .select('name')
        .order('name');
      
      if (error) throw error;
      return data as Category[];
    }
  });

  // Fetch items and published guest submissions
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['items', searchTerm, selectedCategory, activeTab, selectedStatus],
    queryFn: async () => {
      // Base items - filter by active tab (lost/found)
      let itemsQuery = (supabase as any)
        .from('items')
        .select('*')
        .eq('status', selectedStatus)
        .eq('item_type', activeTab)
        .order('created_at', { ascending: false });

      if (selectedCategory !== 'all') itemsQuery = itemsQuery.eq('category', selectedCategory);
      if (searchTerm) itemsQuery = itemsQuery.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%`);

      const [{ data: coreItems, error: itemsErr }, { data: guestItems, error: guestErr }] = await Promise.all([
        itemsQuery,
        (supabase as any)
          .from('guest_submissions')
          .select('*')
          .eq('status', 'published')
          .order('created_at', { ascending: false })
      ]);

      if (itemsErr) throw itemsErr;
      if (guestErr) throw guestErr;

      const mappedGuest = (guestItems || []).map((g: any) => ({
        id: g.id,
        title: g.title,
        description: g.description,
        category: g.category,
        item_type: g.item_type,
        date_lost_found: g.date_lost_found,
        location: g.location,
        contact_name: g.contact_name || 'Guest',
        contact_phone: g.contact_phone || '',
        contact_email: g.contact_email || g.email,
        reward: g.reward || undefined,
        status: 'active',
        created_at: g.created_at,
        latitude: g.latitude || undefined,
        longitude: g.longitude || undefined,
        verification_questions: g.verification_questions || [],
        user_id: 'guest',
        photos: g.photos || [],
      }));

      return ([...(coreItems || []), ...mappedGuest]) as Item[];
    }
  });

  // Fetch verification status for item owners
  useEffect(() => {
    const fetchVerifications = async () => {
      if (!items || items.length === 0) return;
      
      const userIds = [...new Set(items.map(item => item.user_id).filter(id => id !== 'guest'))];
      if (userIds.length === 0) return;

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, is_verified')
        .in('id', userIds);

      if (profiles) {
        const verifications: UserVerification = {};
        profiles.forEach(profile => {
          verifications[profile.id] = profile.is_verified || false;
        });
        setUserVerifications(verifications);
      }
    };

    fetchVerifications();
  }, [items]);

  const handleQuickContact = async (item: Item) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to send messages.",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    if (user.id === item.user_id) {
      toast({
        title: "Cannot message yourself",
        description: "You cannot send a message to yourself.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: item.user_id,
          content: `Hi! I'm interested in your ${item.item_type} item: "${item.title}". Could you please provide more details?`,
        });

      if (error) throw error;

      toast({
        title: "Message sent!",
        description: "Your message has been sent. Check the Messages page to continue the conversation.",
      });
      
      navigate('/messages');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  };

  const ItemCard = ({ item }: { item: Item }) => {
    const photos = Array.isArray(item.photos) ? item.photos : [];
    const thumbnailUrl = photos.length > 0 ? photos[0] : null;
    const isLost = item.item_type === 'lost';

    return (
      <Card className={`card-float group overflow-hidden ${isLost ? 'item-card-lost' : 'item-card-found'}`}>
        {/* Thumbnail Image */}
        {thumbnailUrl && (
          <div className="w-full h-48 overflow-hidden">
            <img 
              src={thumbnailUrl} 
              alt={item.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
        )}
        
        {/* Card Header */}
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg mb-3 font-semibold group-hover:text-primary transition-colors line-clamp-1">
                {item.title}
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                {/* Lost/Found Badge with distinct styling */}
                <span className={isLost ? 'badge-lost' : 'badge-found'}>
                  {isLost ? 'LOST' : 'FOUND'}
                </span>
                <Badge variant="outline" className="text-xs border-border/50">
                  {item.category}
                </Badge>
                {item.reward && (
                  <Badge variant="secondary" className="text-xs">
                    {t('labels.reward')}{item.reward}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        {/* Card Content */}
        <CardContent className="pt-0">
          <CardDescription className="mb-4 line-clamp-2 group-hover:text-foreground/80 transition-colors">
            {item.description}
          </CardDescription>
          
          {/* Item Details */}
          <div className="space-y-2.5 text-sm text-muted-foreground">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="truncate">{item.location}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-3.5 h-3.5 text-primary" />
              </div>
              <span>
                {isLost ? t('labels.lostOn') : t('labels.foundOn')}
                {format(new Date(item.date_lost_found), 'MMM dd, yyyy')}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <UserAvatar 
                userId={item.user_id} 
                userName={item.contact_name}
                size="sm"
                clickable={item.user_id !== 'guest'}
              />
              <span className="truncate flex items-center gap-1.5">
                {item.contact_name}
                {item.user_id !== 'guest' && userVerifications[item.user_id] && (
                  <VerifiedBadge size="sm" />
                )}
              </span>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2 mt-5 pt-4 border-t border-border/50">
            {user && user.id !== item.user_id && item.user_id !== 'guest' && (
              <Button 
                variant="default" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuickContact(item);
                }}
                className="btn-pressable flex-1"
              >
                <MessageCircle className="w-4 h-4 mr-1.5" />
                {isLost ? 'Contact Finder' : 'Claim Item'}
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setSelectedItem(item);
                setIsDialogOpen(true);
              }}
              className="flex-1 hover-lift"
            >
              <Eye className="w-4 h-4 mr-1.5" />
              {t('buttons.view')}
            </Button>
          </div>
          
          {/* Posted Date */}
          <p className="text-xs text-muted-foreground mt-3 opacity-60">
            {t('labels.posted')}{format(new Date(item.created_at), 'MMM dd, yyyy')}
          </p>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background page-enter">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
            <span className="text-gradient">Browse</span>{' '}
            <span className="text-foreground">Lost & Found</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t('labels.helpReunite')}</p>
        </div>

        {/* Pill Tabs for Lost/Found */}
        <div className="flex justify-center mb-8">
          <div className="pill-tabs">
            <button
              onClick={() => setActiveTab('lost')}
              className={`pill-tab pill-tab-lost ${activeTab === 'lost' ? 'pill-tab-active' : ''}`}
            >
              <AlertTriangle className="w-4 h-4 mr-2 inline-block" />
              Lost Items
            </button>
            <button
              onClick={() => setActiveTab('found')}
              className={`pill-tab pill-tab-found ${activeTab === 'found' ? 'pill-tab-active' : ''}`}
            >
              <CheckCircle className="w-4 h-4 mr-2 inline-block" />
              Found Items
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <Card className="mb-8 card-float">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder={t('labels.searchItems')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 input-refined"
                />
              </div>

              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="input-refined">
                  <SelectValue placeholder={t('labels.category')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('labels.allCategories')}</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.name} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="input-refined">
                  <SelectValue placeholder={t('labels.status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t('labels.active')}</SelectItem>
                  <SelectItem value="matched">{t('labels.matched')}</SelectItem>
                  <SelectItem value="returned">{t('labels.returned')}</SelectItem>
                  <SelectItem value="closed">{t('labels.closed')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Demo Mode Toggle */}
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-border/50">
              <div className="flex items-center gap-3">
                <Switch 
                  id="demo-mode" 
                  checked={demoMode}
                  onCheckedChange={setDemoMode}
                />
                <Label 
                  htmlFor="demo-mode" 
                  className="text-sm cursor-pointer flex items-center gap-2"
                >
                  <Sparkles className={`w-4 h-4 ${demoMode ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={demoMode ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                    View demo items (fictional)
                  </span>
                </Label>
              </div>
              {demoMode && (
                <Badge variant="secondary" className="text-xs">
                  Demo Mode
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Demo Mode Banner */}
        {demoMode && (
          <Alert className="mb-6 border-primary/30 bg-primary/5">
            <Info className="h-4 w-4 text-primary" />
            <AlertDescription className="text-sm">
              <span className="font-medium">Demo Mode Active:</span> You are viewing demo items added for UI demonstration only. These are fictional listings.
            </AlertDescription>
          </Alert>
        )}

        {/* Demo Listings - Only when demo mode is ON */}
        {demoMode ? (
          <DemoListings />
        ) : (
          /* Real Results - Only when demo mode is OFF */
          <>
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="relative">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  <div className="absolute inset-0 rounded-full border-2 border-primary/20"></div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6 animate-fade-in">
                  <p className="text-muted-foreground font-cyber">
                    {t('labels.found')} <span className="text-neon font-bold">{items.length}</span> {activeTab} item{items.length !== 1 ? 's' : ''}
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-primary" />
                      <span className="text-sm text-muted-foreground font-cyber">
                        {selectedCategory !== 'all' && `in ${selectedCategory}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={viewMode === 'grid' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('grid')}
                        className="font-cyber hover-glow"
                      >
                        <Tag className="w-4 h-4 mr-1" />
                        {t('buttons.grid')}
                      </Button>
                      <Button
                        variant={viewMode === 'map' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('map')}
                        className="font-cyber hover-glow"
                      >
                        <Map className="w-4 h-4 mr-1" />
                        {t('buttons.map')}
                      </Button>
                    </div>
                  </div>
                </div>

                {items.length === 0 ? (
                  <Card className="text-center py-12 glass-card border border-primary/20">
                    <CardContent>
                      <Tag className="w-12 h-12 text-primary mx-auto mb-4 animate-float" />
                      <h3 className="text-lg font-cyber font-semibold text-foreground mb-2">{t('labels.noItemsFound')}</h3>
                      <p className="text-muted-foreground font-cyber">
                        {t('labels.tryAdjusting')}
                      </p>
                    </CardContent>
                  </Card>
                ) : viewMode === 'map' ? (
                  <Card className="glass-card border border-primary/20">
                    <CardContent className="p-0">
                      <GoogleMap
                        center={{ lat: 40.7128, lng: -74.0060 }}
                        zoom={12}
                        markers={items
                          .filter(item => item.latitude && item.longitude)
                          .map(item => ({
                            position: { lat: item.latitude!, lng: item.longitude! },
                            title: item.title,
                            type: item.item_type,
                            onClick: () => {
                              setSelectedItem(item);
                              setIsDialogOpen(true);
                            }
                          }))}
                        height="600px"
                      />
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                    {items.map((item, index) => (
                      <div key={item.id} style={{ animationDelay: `${index * 100}ms` }}>
                        <ItemCard item={item} />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
      
      <ItemDetailsDialog 
        item={selectedItem}
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setSelectedItem(null);
        }}
      />
    </div>
  );
};

export default Browse;
