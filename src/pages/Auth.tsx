
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthForm } from '@/components/auth/AuthForm';
import { useAuth } from '@/hooks/useAuth';

const Auth = () => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !loading) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Futuristic Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-pulse-glow"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse-glow animation-delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-primary/10 to-accent/10 rounded-full blur-3xl animate-float"></div>
      </div>
      
      {/* Particle Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-2 h-2 bg-primary/30 rounded-full top-1/4 left-1/4 animate-float"></div>
        <div className="absolute w-1 h-1 bg-accent/40 rounded-full top-3/4 right-1/4 animate-float animation-delay-1000"></div>
        <div className="absolute w-3 h-3 bg-info/20 rounded-full top-1/2 right-1/3 animate-float animation-delay-2000"></div>
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto p-4">
        <div className="glass-card rounded-3xl shadow-elegant backdrop-blur-3xl border border-primary/20 p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-cyber font-bold mb-4">
              <span className="text-gradient animate-cyber-flicker">Find</span>
              <span className="text-primary">It</span>
            </h1>
            <p className="text-muted-foreground font-cyber">
              {mode === 'login' ? 'Welcome back to the future' : 'Join the next generation platform'}
            </p>
          </div>
          
          <AuthForm mode={mode} onToggleMode={toggleMode} />
        </div>
      </div>
    </div>
  );
};

export default Auth;
