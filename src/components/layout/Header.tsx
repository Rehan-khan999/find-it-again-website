
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
    <header className="glass-effect shadow-cyber border-b border-primary/20 sticky top-0 z-50 backdrop-blur-3xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="bg-gradient-to-br from-primary to-accent text-primary-foreground p-2 rounded-xl shadow-cyber group-hover:shadow-neon transition-all duration-300 group-hover:scale-110 animate-pulse-glow">
              <Search className="h-6 w-6" />
            </div>
            <span className="text-2xl font-cyber font-black text-gradient">FindIt</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/browse" className="text-muted-foreground hover:text-neon transition-colors duration-200 font-cyber font-semibold hover-neon">
              {t('nav.browse')}
            </Link>
            <Link to="/success-stories" className="text-muted-foreground hover:text-neon transition-colors duration-200 font-cyber font-semibold hover-neon">
              Success Stories
            </Link>
            {user && (
              <>
                 <Link to="/matches" className="text-muted-foreground hover:text-neon transition-colors duration-200 font-cyber font-semibold hover-neon">
                  {t('nav.matches')}
                </Link>
                <Link to="/my-items" className="text-muted-foreground hover:text-neon transition-colors duration-200 font-cyber font-semibold hover-neon">
                  {t('nav.myItems')}
                </Link>
                <Link to="/claims" className="text-muted-foreground hover:text-neon transition-colors duration-200 font-cyber font-semibold hover-neon">
                  {t('nav.claims')}
                </Link>
                <Link to="/messages" className="text-muted-foreground hover:text-neon transition-colors duration-200 font-cyber font-semibold hover-neon">
                  {t('nav.messages')}
                </Link>
                <Link to="/post-lost" className="text-muted-foreground hover:text-neon transition-colors duration-200 font-cyber font-semibold hover-neon">
                  {t('nav.postLost')}
                </Link>
                <Link to="/post-found" className="text-muted-foreground hover:text-neon transition-colors duration-200 font-cyber font-semibold hover-neon">
                  {t('nav.postFound')}
                </Link>
                {(isAdmin || isModerator) && (
                  <Link to="/admin" className="text-muted-foreground hover:text-neon transition-colors duration-200 font-cyber font-semibold hover-neon flex items-center gap-1">
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
                  className="hidden sm:inline-flex btn-cyber font-cyber font-semibold hover-lift"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('buttons.postItem')}
                </Button>
                <NotificationSystem />
                <UserMenu />
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  onClick={() => navigate('/auth')}
                  className="font-cyber font-semibold hover:bg-primary/10 hover:text-neon transition-all duration-200"
                >
                  {t('buttons.signIn')}
                </Button>
                <Button
                  onClick={() => navigate('/auth')}
                  className="btn-cyber font-cyber font-semibold hover-lift"
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
