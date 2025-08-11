
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { UserMenu } from '@/components/auth/UserMenu';
import { NotificationSystem } from '@/components/NotificationSystem';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { Search, Plus, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';

export const Header = () => {
  const { user } = useAuth();
  const { isAdmin, isModerator } = useAdmin();
  const navigate = useNavigate();
  const { t } = useTranslation();

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
              {t('nav.browse')}
            </Link>
            <Link to="/success-stories" className="text-gray-600 hover:text-gray-900">
              Success Stories
            </Link>
            {user && (
              <>
                 <Link to="/matches" className="text-gray-600 hover:text-gray-900">
                  {t('nav.matches')}
                </Link>
                <Link to="/my-items" className="text-gray-600 hover:text-gray-900">
                  {t('nav.myItems')}
                </Link>
                <Link to="/claims" className="text-gray-600 hover:text-gray-900">
                  {t('nav.claims')}
                </Link>
                <Link to="/messages" className="text-gray-600 hover:text-gray-900">
                  {t('nav.messages')}
                </Link>
                <Link to="/post-lost" className="text-gray-600 hover:text-gray-900">
                  {t('nav.postLost')}
                </Link>
                <Link to="/post-found" className="text-gray-600 hover:text-gray-900">
                  {t('nav.postFound')}
                </Link>
                {(isAdmin || isModerator) && (
                  <Link to="/admin" className="text-gray-600 hover:text-gray-900 flex items-center gap-1">
                    <Shield className="h-4 w-4" />
                    {t('nav.admin')}
                  </Link>
                )}
              </>
            )}
          </nav>

          {/* Auth Section */}
          <div className="flex items-center space-x-4">
            <LanguageSwitcher />
            <ThemeToggle />
            {user ? (
              <>
                <Button
                  onClick={() => navigate('/post-lost')}
                  size="sm"
                  className="hidden sm:inline-flex"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('buttons.postItem')}
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
                  {t('buttons.signIn')}
                </Button>
                <Button
                  onClick={() => navigate('/auth')}
                >
                  {t('buttons.getStarted')}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
