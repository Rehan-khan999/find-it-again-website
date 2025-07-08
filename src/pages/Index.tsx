
import { Link } from "react-router-dom";
import { Search, MapPin, Users, Shield, Plus, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const { user } = useAuth();

  // Fetch recent items for preview
  const { data: recentItems = [] } = useQuery({
    queryKey: ['recent-items'],
    queryFn: async () => {
      const { data, error } = await supabase
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
        supabase.from('items').select('id', { count: 'exact' }).eq('item_type', 'lost').eq('status', 'active'),
        supabase.from('items').select('id', { count: 'exact' }).eq('item_type', 'found').eq('status', 'active'),
        supabase.from('items').select('id', { count: 'exact' }).eq('status', 'returned')
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
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Lost Something? <br />
            <span className="text-blue-600">We'll Help You Find It</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Connect with your community to report lost items, post found belongings, 
            and help reunite people with their precious possessions.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <>
                <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
                  <Link to="/post-lost">
                    <Plus className="w-5 h-5 mr-2" />
                    Post Lost Item
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/post-found">
                    <Search className="w-5 h-5 mr-2" />
                    Post Found Item
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
                  <Link to="/auth">Get Started</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/browse">
                    <Eye className="w-5 h-5 mr-2" />
                    Browse Items
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats Section */}
      {stats && (
        <div className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold text-blue-600 mb-2">{stats.lost}</div>
                <div className="text-gray-600">Active Lost Items</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-green-600 mb-2">{stats.found}</div>
                <div className="text-gray-600">Items Found</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-purple-600 mb-2">{stats.returned}</div>
                <div className="text-gray-600">Successfully Returned</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Features Section */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Our platform makes it easy to report lost items and help others find their belongings
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardHeader>
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-blue-600" />
                </div>
                <CardTitle>Report & Search</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Post detailed descriptions of lost or found items with photos and location information
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardHeader>
                <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-8 h-8 text-green-600" />
                </div>
                <CardTitle>Smart Matching</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Our algorithm suggests potential matches based on description, location, and timing
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardHeader>
                <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-purple-600" />
                </div>
                <CardTitle>Safe Reunion</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Connect safely with verification questions and secure messaging to ensure proper ownership
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Recent Items Preview */}
      {recentItems.length > 0 && (
        <div className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center mb-12">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Recent Items</h2>
                <p className="text-gray-600">Latest lost and found items from the community</p>
              </div>
              <Button asChild variant="outline">
                <Link to="/browse">View All Items</Link>
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
                    <div className="flex items-center text-sm text-gray-600">
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
      <div className="py-20 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Help Your Community?
          </h2>
          <p className="text-blue-100 mb-8 text-lg">
            Join thousands of people helping reunite others with their belongings
          </p>
          
          {!user && (
            <Button asChild size="lg" variant="secondary">
              <Link to="/auth">Sign Up Now</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
