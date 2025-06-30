
import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, MapPin, Plus, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Mock data for demonstration
const recentItems = [
  {
    id: 1,
    title: "iPhone 13 Pro",
    description: "Lost near Central Park, black case with stickers",
    type: "lost",
    category: "Electronics",
    location: "Central Park, NYC",
    date: "2024-06-28",
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
    image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=300&h=200&fit=crop"
  }
];

const Index = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredItems = recentItems.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-green-500 rounded-lg flex items-center justify-center">
                <Search className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">FindIt</h1>
            </div>
            <nav className="hidden md:flex space-x-6">
              <Link to="/" className="text-gray-600 hover:text-gray-900 transition-colors">Home</Link>
              <Link to="/browse" className="text-gray-600 hover:text-gray-900 transition-colors">Browse</Link>
              <Link to="/post-lost" className="text-gray-600 hover:text-gray-900 transition-colors">Post Lost</Link>
              <Link to="/post-found" className="text-gray-600 hover:text-gray-900 transition-colors">Post Found</Link>
            </nav>
            <div className="flex space-x-2">
              <Link to="/post-lost">
                <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50">
                  <Plus className="w-4 h-4 mr-1" />
                  Lost Item
                </Button>
              </Link>
              <Link to="/post-found">
                <Button size="sm" className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-1" />
                  Found Item
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Lost Something? Found Something?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Connect with your community to reunite lost items with their owners
          </p>
          
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-12">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search for lost or found items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-4 py-6 text-lg rounded-xl border-2 border-gray-200 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="text-3xl font-bold text-blue-600 mb-2">247</div>
              <div className="text-gray-600">Items Lost</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="text-3xl font-bold text-green-600 mb-2">89</div>
              <div className="text-gray-600">Items Found</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="text-3xl font-bold text-purple-600 mb-2">156</div>
              <div className="text-gray-600">Happy Reunions</div>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Items */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-2xl font-bold text-gray-900">Recent Items</h3>
            <Link to="/browse">
              <Button variant="outline" className="group">
                <Eye className="w-4 h-4 mr-2" />
                View All
              </Button>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredItems.map((item) => (
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
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg line-clamp-1">{item.title}</CardTitle>
                  <CardDescription className="line-clamp-2">{item.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-gray-500 mb-2">
                    <MapPin className="w-4 h-4 mr-1" />
                    {item.location}
                  </div>
                  <div className="text-sm text-gray-400">{item.date}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-green-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-3xl font-bold mb-6">Help Someone Today</h3>
          <p className="text-xl mb-8 opacity-90">
            Every item posted brings us one step closer to reuniting someone with their lost belongings
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/post-lost">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                <Plus className="w-5 h-5 mr-2" />
                Report Lost Item
              </Button>
            </Link>
            <Link to="/post-found">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                <Plus className="w-5 h-5 mr-2" />
                Report Found Item
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-green-500 rounded-lg flex items-center justify-center">
                  <Search className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">FindIt</span>
              </div>
              <p className="text-gray-400">
                Connecting communities to reunite lost items with their owners.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
                <li><Link to="/browse" className="hover:text-white transition-colors">Browse Items</Link></li>
                <li><Link to="/post-lost" className="hover:text-white transition-colors">Post Lost</Link></li>
                <li><Link to="/post-found" className="hover:text-white transition-colors">Post Found</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Categories</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Electronics</li>
                <li>Personal Items</li>
                <li>Pets</li>
                <li>Jewelry</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Help Center</li>
                <li>Contact Us</li>
                <li>Safety Tips</li>
                <li>Community Guidelines</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 FindIt. All rights reserved. Built for connecting communities.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
