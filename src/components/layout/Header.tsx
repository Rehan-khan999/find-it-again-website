
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { UserMenu } from '@/components/auth/UserMenu';
import { NotificationSystem } from '@/components/NotificationSystem';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { Search, Plus, Shield, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const Header = () => {
  const { user } = useAuth();
  const { isAdmin, isModerator } = useAdmin();
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <header className="navbar-glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md group-hover:scale-105 group-hover:shadow-lg transition-all duration-300">
              <Search className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-display font-bold tracking-tight">
              Find<span className="text-gradient">It</span>
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {user ? (
              <>
                <Link to="/browse" className="text-muted-foreground hover:text-primary transition-all duration-200 font-semibold hover:-translate-y-0.5">
                  {t('nav.browse')}
                </Link>
                <Link to="/my-items" className="text-muted-foreground hover:text-primary transition-all duration-200 font-semibold hover:-translate-y-0.5">
                  {t('nav.myItems')}
                </Link>
                <Link to="/claims" className="text-muted-foreground hover:text-primary transition-all duration-200 font-semibold hover:-translate-y-0.5">
                  {t('nav.claims')}
                </Link>
                <Link to="/messages" className="text-muted-foreground hover:text-primary transition-all duration-200 font-semibold hover:-translate-y-0.5">
                  {t('nav.messages')}
                </Link>
                {(isAdmin || isModerator) && (
                  <Link to="/admin" className="text-muted-foreground hover:text-primary transition-all duration-200 font-semibold flex items-center gap-1 hover:-translate-y-0.5">
                    <Shield className="h-4 w-4" />
                    {t('nav.admin')}
                  </Link>
                )}
              </>
            ) : null}
          </nav>

          {/* Auth Section */}
          <div className="flex items-center space-x-4">
            <LanguageSwitcher />
            <ThemeToggle />
            {user ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      className="hidden sm:inline-flex btn-modern font-semibold hover-lift"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t('buttons.postItem')}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem 
                      onClick={() => navigate('/post-lost')}
                      className="cursor-pointer py-3 text-amber-600 dark:text-amber-400 hover:!bg-amber-50 dark:hover:!bg-amber-950/50 font-medium"
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Report Lost Item
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => navigate('/post-found')}
                      className="cursor-pointer py-3 text-teal-600 dark:text-teal-400 hover:!bg-teal-50 dark:hover:!bg-teal-950/50 font-medium"
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      Report Found Item
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <NotificationSystem />
                <UserMenu />
              </>
            ) : (
              <Button
                onClick={() => navigate('/auth')}
                className="btn-modern font-semibold hover-lift"
              >
                {t('buttons.getStarted')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
