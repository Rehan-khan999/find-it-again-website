import { useNavigate } from "react-router-dom";
import { Search, MapPin, Shield, Sparkles, Zap, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { StarfieldBackground } from "@/components/StarfieldBackground";
import { useTranslation } from 'react-i18next';

export default function Index() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen relative">
      {/* Animated Starfield Background */}
      <StarfieldBackground />
      
      {/* Hero Section */}
      <section className="relative min-h-[95vh] flex items-center justify-center overflow-hidden">
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="animate-fade-in float">
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-display font-bold mb-6 tracking-tight leading-tight">
              Find What's
              <span className="block text-gradient mt-2">Lost in Space</span>
            </h1>
            
            <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
              A cosmic platform connecting people with their lost belongings through AI-powered matching and secure verification
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              {user ? (
                <>
                  <Button
                    size="lg"
                    onClick={() => navigate('/post-lost')}
                    className="btn-modern text-lg px-12 py-7 font-semibold hover-lift"
                  >
                    <Search className="mr-2 h-5 w-5" />
                    Report Lost Item
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate('/post-found')}
                    className="text-lg px-12 py-7 font-semibold hover-lift glass-effect border-primary/30 hover:border-primary/60 hover:bg-primary/10"
                  >
                    <MapPin className="mr-2 h-5 w-5" />
                    Report Found Item
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="lg"
                    onClick={() => navigate('/auth')}
                    className="btn-modern text-lg px-12 py-7 font-semibold hover-lift"
                  >
                    Get Started
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate('/browse')}
                    className="text-lg px-12 py-7 font-semibold hover-lift glass-effect border-primary/30 hover:border-primary/60 hover:bg-primary/10"
                  >
                    <Search className="mr-2 h-5 w-5" />
                    Browse Items
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative py-32 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-display font-bold mb-6">
              How It <span className="text-gradient">Works</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Three simple steps to reunite with your belongings
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            {[
              {
                step: "01",
                title: "Report Your Item",
                description: "Create a detailed report with photos, descriptions, and location details. Our system securely stores your information.",
                icon: MapPin
              },
              {
                step: "02",
                title: "AI-Powered Matching",
                description: "Advanced algorithms analyze your report and automatically scan for potential matches across our database.",
                icon: Sparkles
              },
              {
                step: "03",
                title: "Secure Recovery",
                description: "Get instant notifications when matches are found. Connect safely through our verified messaging system.",
                icon: Shield
              }
            ].map((step, index) => (
              <div
                key={step.step}
                className="glass-card p-10 rounded-3xl hover-lift transition-all shadow-cosmic"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <div className="mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-6 shadow-cosmic">
                    <step.icon className="h-8 w-8 text-white" />
                  </div>
                  <span className="text-5xl font-display font-bold text-primary/20">{step.step}</span>
                </div>
                <h3 className="text-2xl font-display font-bold mb-4">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed text-lg">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-32 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-display font-bold mb-6">
              Powered by <span className="text-gradient">Innovation</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Cutting-edge technology that makes recovery simple
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Sparkles,
                title: "AI Matching Engine",
                description: "Machine learning algorithms analyze patterns and characteristics to find your items faster than ever before."
              },
              {
                icon: Shield,
                title: "Blockchain Security",
                description: "Decentralized verification ensures authentic claims and protects against fraud with immutable records."
              },
              {
                icon: Zap,
                title: "Instant Notifications",
                description: "Real-time alerts keep you updated the moment a potential match is discovered in our system."
              },
              {
                icon: MapPin,
                title: "Location Intelligence",
                description: "Advanced geo-matching connects items with their owners based on proximity and movement patterns."
              },
              {
                icon: Heart,
                title: "Community Trust",
                description: "Built on transparency and collaboration, fostering a network of people helping people."
              },
              {
                icon: Search,
                title: "Visual Recognition",
                description: "Image analysis technology identifies items by their unique visual characteristics and features."
              }
            ].map((feature, index) => (
              <div
                key={feature.title}
                className="group glass-card p-8 rounded-3xl hover-lift transition-all shadow-cosmic"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-cosmic">
                  <feature.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-display font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32 overflow-hidden z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5"></div>
        
        <div className="relative z-10 max-w-5xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <div className="glass-card p-16 rounded-3xl shadow-cosmic">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-display font-bold mb-6">
              Begin Your <span className="text-gradient">Journey</span>
            </h2>
            
            <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
              Join a community dedicated to helping people reconnect with what matters most
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
              {!user ? (
                <>
                  <Button
                    size="lg"
                    onClick={() => navigate('/auth')}
                    className="btn-modern text-lg px-12 py-7 font-semibold hover-lift"
                  >
                    Join the Mission
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate('/browse')}
                    className="text-lg px-12 py-7 font-semibold hover-lift glass-effect border-primary/30 hover:border-primary/60 hover:bg-primary/10"
                  >
                    Explore Now
                  </Button>
                </>
              ) : (
                <Button
                  size="lg"
                  onClick={() => navigate('/browse')}
                  className="btn-modern text-lg px-12 py-7 font-semibold hover-lift"
                >
                  Start Your Search
                </Button>
              )}
            </div>

            {/* Trust Indicators */}
            <div className="pt-8 border-t border-border/30">
              <div className="flex flex-col sm:flex-row justify-center items-center gap-10 text-sm">
                <div className="flex items-center gap-3 group">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <span className="font-semibold text-foreground">Secure & Verified</span>
                </div>
                <div className="flex items-center gap-3 group">
                  <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Sparkles className="h-5 w-5 text-accent" />
                  </div>
                  <span className="font-semibold text-foreground">AI-Enhanced</span>
                </div>
                <div className="flex items-center gap-3 group">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Heart className="h-5 w-5 text-primary" />
                  </div>
                  <span className="font-semibold text-foreground">Community Driven</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}