
import { useState } from "react";
import { Search, Filter, MapPin, Calendar, User, Tag, Eye, Map } from "lucide-react";
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
}

interface Category {
  name: string;
}

const Browse = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("active");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');

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

  // Fetch items with filters
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['items', searchTerm, selectedCategory, selectedType, selectedStatus],
    queryFn: async () => {
      let query = (supabase as any)
        .from('items')
        .select('*')
        .eq('status', selectedStatus)
        .order('created_at', { ascending: false });

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      if (selectedType !== 'all') {
        query = query.eq('item_type', selectedType);
      }

      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as Item[];
    }
  });

  const ItemCard = ({ item }: { item: Item }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-2">{item.title}</CardTitle>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={item.item_type === 'lost' ? 'destructive' : 'default'}>
                {item.item_type === 'lost' ? 'LOST' : 'FOUND'}
              </Badge>
              <Badge variant="outline">{item.category}</Badge>
              {item.reward && (
                <Badge variant="secondary">Reward: {item.reward}</Badge>
              )}
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              setSelectedItem(item);
              setIsDialogOpen(true);
            }}
          >
            <Eye className="w-4 h-4 mr-1" />
            View
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="mb-4 line-clamp-3">
          {item.description}
        </CardDescription>
        
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span>{item.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>
              {item.item_type === 'lost' ? 'Lost on: ' : 'Found on: '}
              {format(new Date(item.date_lost_found), 'MMM dd, yyyy')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span>Contact: {item.contact_name}</span>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-gray-500">
            Posted {format(new Date(item.created_at), 'MMM dd, yyyy')}
          </p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Browse Lost & Found Items</h1>
          <p className="text-gray-600">Help reunite people with their belongings</p>
        </div>

        {/* Search and Filters */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search items, locations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Item type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="lost">Lost Items</SelectItem>
                  <SelectItem value="found">Found Items</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.name} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="matched">Matched</SelectItem>
                  <SelectItem value="returned">Returned</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <p className="text-gray-600">
                Found {items.length} item{items.length !== 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {selectedType !== 'all' && `${selectedType} items`}
                    {selectedCategory !== 'all' && ` in ${selectedCategory}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                  >
                    <Tag className="w-4 h-4 mr-1" />
                    Grid
                  </Button>
                  <Button
                    variant={viewMode === 'map' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('map')}
                  >
                    <Map className="w-4 h-4 mr-1" />
                    Map
                  </Button>
                </div>
              </div>
            </div>

            {items.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Tag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No items found</h3>
                  <p className="text-gray-600">
                    Try adjusting your search criteria or check back later for new postings.
                  </p>
                </CardContent>
              </Card>
            ) : viewMode === 'map' ? (
              <Card>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((item) => (
                  <ItemCard key={item.id} item={item} />
                ))}
              </div>
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
