import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  userId: string;
  userName?: string;
  size?: 'sm' | 'md' | 'lg';
  clickable?: boolean;
  showFallbackName?: boolean;
  className?: string;
}

interface CachedProfile {
  avatar_url: string | null;
  full_name: string | null;
}

// Simple in-memory cache for profile data
const profileCache: Map<string, CachedProfile> = new Map();

export const UserAvatar = ({
  userId,
  userName,
  size = 'md',
  clickable = true,
  showFallbackName = true,
  className,
}: UserAvatarProps) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<CachedProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  useEffect(() => {
    if (!userId || userId === 'guest') {
      setLoading(false);
      return;
    }

    // Check cache first
    if (profileCache.has(userId)) {
      setProfile(profileCache.get(userId)!);
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('avatar_url, full_name')
          .eq('id', userId)
          .single();

        if (!error && data) {
          const profileData = {
            avatar_url: data.avatar_url,
            full_name: data.full_name,
          };
          profileCache.set(userId, profileData);
          setProfile(profileData);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  const handleClick = () => {
    if (clickable && userId && userId !== 'guest') {
      navigate(`/user/${userId}`);
    }
  };

  const displayName = profile?.full_name || userName || 'User';
  const avatarUrl = profile?.avatar_url;
  const fallbackChar = displayName.charAt(0).toUpperCase();

  if (userId === 'guest') {
    return (
      <Avatar className={cn(sizeClasses[size], className)}>
        <AvatarFallback className="bg-muted text-muted-foreground">G</AvatarFallback>
      </Avatar>
    );
  }

  return (
    <Avatar
      className={cn(
        sizeClasses[size],
        clickable && 'cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all',
        className
      )}
      onClick={handleClick}
    >
      <AvatarImage src={avatarUrl || undefined} alt={displayName} />
      <AvatarFallback className="bg-primary/10 text-primary">
        {showFallbackName ? fallbackChar : 'U'}
      </AvatarFallback>
    </Avatar>
  );
};