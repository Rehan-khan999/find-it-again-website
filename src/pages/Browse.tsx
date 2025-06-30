
import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Filter, MapPin, Calendar, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Extended mock data
const allItems = [
  {
    id: 1,
    title: "iPhone 13 Pro",
    description: "Lost near Central Park, black case with stickers",
    type: "lost",
    category: "Electronics",
    location: "Central Park, NYC",
    date: "2024-06-28",
    contactName: "Sarah Johnson",
    reward: "$100",
    image: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=300&h=200&fit=crop"
  },
  {
    id: 2,
    title: "Brown Leather Wallet",
    description: "Found at Starbucks on 5th Avenue, contains ID cards",
    type: "found",
    category: "Personal Items",
    location: "5th Avenue, NYC",
    date: "2024-06-29",
    contactName: "Mike Chen",
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&h=200&fit=crop"
  },
  {
    id: 3,
    title: "Golden Retriever",
    description: "Lost family dog, very friendly, answers to Max",
    type: "lost",
    category: "Pets",
    location: "Brooklyn Bridge Park",
    date: "2024-06-30",
    contactName: "Emily Davis",
    reward: "$500",
    image: "https://images.unsplash.com/photo-1552053831-71594a27632d?w=300&h=200&fit=crop"
  },
  {
    id: 4,
    title: "Silver Watch",
    description: "Found at gym, appears to be expensive brand",
    type: "found",
    category: "Jewelry",
    location: "Fitness First Gym",
    date: "2024-06-30",
    contactName: "David Wilson",
    image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=300&h=200&fit=crop"
  },
  {
    id: 5,
    title: "Black Backpack",
    description: "Lost laptop bag with important documents",
    type: "lost",
    category: "Bags",
    location: "Union Station",
    date: "2024-06-25",
    contactName: "Alex Kim",
    reward: "$200",
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&h=200&fit=crop"
  },
  {
    id: 6,
    title: "Car Keys",
    description: "Found Toyota keys with blue keychain",
    type: "found",
    category: "Keys",
    location: "Central Mall parking",
    date: "2024-06-29",
    contactName: "Lisa Wong",
    image: "https://images.unsplash.com/photo-1582139329536-e7284fece509?w=300&h=200&fit=crop"
  }
];

const Browse = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedType, setSelectedType] = useState("all");

  const categories = ["all", "Electronics", "Personal Items", "Pets", "Jewelry", "Bags", "Keys", "Documents", "Clothing", "Other"];

  const filteredItems = allItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    const matchesType = selectedType === "all" || item.type === selectedType;
    
    return matchesSearch && matchesCategory && matchesType;
  });

  const lostItems = filteredItems.filter(item => item.type === "lost");
  const foundItems = filteredItems.filter(item => item.type === "found");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center text-gray-600 hover:text-gray-900 transition-colors">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Home
            </Link>
            <h1 className="text-xl font-semibold text-gray-900">Browse Items</h1>
            <div className="w-20"></div> {/* Spacer for centering */}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Search items, locations, descriptions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category === "all" ? "All Categories" : category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                  <SelectItem value="found">Found</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Results */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="all">All Items ({filteredItems.length})</TabsTrigger>
            <TabsTrigger value="lost">Lost Items ({lostItems.length})</TabsTrigger>
            <TabsTrigger value="found">Found Items ({foundItems.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <ItemGrid items={filteredItems} />
          </TabsContent>

          <TabsContent value="lost">
            <ItemGrid items={lostItems} />
          </TabsContent>

          <TabsContent value="found">
            <ItemGrid items={foundItems} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

const ItemGrid = ({ items }: { items: typeof allItems }) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <Search className="w-12 h-12 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
        <p className="text-gray-500">Try adjusting your search criteria</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item) => (
        <Card key={item.id} className="hover:shadow-lg transition-shadow duration-200 cursor-pointer group">
          <div className="relative overflow-hidden rounded-t-lg">
            <img
              src={item.image}
              alt={item.title}
              className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-200"
            />
            <Badge 
              className={`absolute top-3 left-3 ${
                item.type === 'lost' 
                  ? 'bg-blue-500 hover:bg-blue-600' 
                  : 'bg-green-500 hover:bg-green-600'
              }`}
            >
              {item.type === 'lost' ? 'Lost' : 'Found'}
            </Badge>
            {item.reward && (
              <Badge className="absolute top-3 right-3 bg-yellow-500 hover:bg-yellow-600">
                {item.reward}
              </Badge>
            )}
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg line-clamp-1">{item.title}</CardTitle>
            <CardDescription className="line-clamp-2">{item.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center text-sm text-gray-500">
                <MapPin className="w-4 h-4 mr-1" />
                {item.location}
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <Calendar className="w-4 h-4 mr-1" />
                {item.date}
              </div>
              <div className="flex items-center justify-between pt-2">
                <Badge variant="outline">{item.category}</Badge>
                <Button size="sm" variant="outline">
                  Contact {item.contactName.split(' ')[0]}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default Browse;
