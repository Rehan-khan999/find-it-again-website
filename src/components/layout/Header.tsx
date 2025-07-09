
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { UserMenu } from '@/components/auth/UserMenu';
import { NotificationSystem } from '@/components/NotificationSystem';
import { useAuth } from '@/hooks/useAuth';
import { Search, Plus } from 'lucide-react';

export const Header = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="bg-blue-600 text-white p-2 rounded-lg">
              <Search className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold text-gray-900">FindIt</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/browse" className="text-gray-600 hover:text-gray-900">
              Browse Items
            </Link>
            {user && (
              <>
                <Link to="/post-lost" className="text-gray-600 hover:text-gray-900">
                  Post Lost Item
                </Link>
                <Link to="/post-found" className="text-gray-600 hover:text-gray-900">
                  Post Found Item
                </Link>
              </>
            )}
          </nav>

          {/* Auth Section */}
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Button
                  onClick={() => navigate('/post-lost')}
                  size="sm"
                  className="hidden sm:inline-flex"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Post Item
                </Button>
                <NotificationSystem />
                <UserMenu />
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  onClick={() => navigate('/auth')}
                >
                  Sign In
                </Button>
                <Button
                  onClick={() => navigate('/auth')}
                >
                  Get Started
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
