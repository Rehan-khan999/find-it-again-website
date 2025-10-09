
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
    <header className="sticky top-0 z-50 w-full border-b border-border/30 glass-effect shadow-cosmic">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-cosmic group-hover:scale-110 transition-all logo-glow">
              <Search className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-display font-bold tracking-tight">
              Find<span className="text-gradient">It</span>
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/browse" className="text-muted-foreground hover:text-primary transition-colors font-semibold hover:scale-105 transition-all">
              {t('nav.browse')}
            </Link>
            {user && (
              <>
                <Link to="/my-items" className="text-muted-foreground hover:text-primary transition-colors font-semibold hover:scale-105 transition-all">
                  {t('nav.myItems')}
                </Link>
                <Link to="/matches" className="text-muted-foreground hover:text-primary transition-colors font-semibold hover:scale-105 transition-all">
                  {t('nav.matches')}
                </Link>
                <Link to="/claims" className="text-muted-foreground hover:text-primary transition-colors font-semibold hover:scale-105 transition-all">
                  {t('nav.claims')}
                </Link>
                <Link to="/messages" className="text-muted-foreground hover:text-primary transition-colors font-semibold hover:scale-105 transition-all">
                  {t('nav.messages')}
                </Link>
                {(isAdmin || isModerator) && (
                  <Link to="/admin" className="text-muted-foreground hover:text-primary transition-colors font-semibold flex items-center gap-1 hover:scale-105 transition-all">
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
                  className="hidden sm:inline-flex btn-modern font-semibold hover-lift"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('buttons.postItem')}
                </Button>
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
