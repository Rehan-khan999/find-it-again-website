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
      {/* Dark background for hero with starfield */}
      <div className="fixed inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 -z-10" />
      
      {/* Animated Starfield Background */}
      <StarfieldBackground />
      
      {/* Hero Section */}
      <section className="relative min-h-[95vh] flex items-center justify-center overflow-hidden page-enter">
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="animate-fade-in">
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold mb-6 tracking-tight leading-tight hero-text">
              Find What's
              <span className="block mt-2 bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent drop-shadow-2xl">
                Lost in Space
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl md:text-2xl hero-text-muted mb-12 max-w-3xl mx-auto leading-relaxed">
              A cosmic platform connecting people with their lost belongings through AI-powered matching and secure verification
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              {user ? (
                <>
                  <Button
                    size="lg"
                    onClick={() => navigate('/post-lost')}
                    className="btn-modern text-lg px-12 py-7 font-semibold"
                  >
                    <Search className="mr-2 h-5 w-5" />
                    Report Lost Item
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate('/post-found')}
                    className="text-lg px-12 py-7 font-semibold bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20 hover:border-white/50"
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
                    className="btn-modern text-lg px-12 py-7 font-semibold"
                  >
                    Get Started
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate('/browse')}
                    className="text-lg px-12 py-7 font-semibold bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20 hover:border-white/50"
                  >
                    <Search className="mr-2 h-5 w-5" />
                    Browse Items
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-2">
            <div className="w-1 h-2 bg-white/60 rounded-full" />
          </div>
        </div>
      </section>

      {/* Content sections with solid background */}
      <div className="relative z-10 bg-background">
        {/* How It Works Section */}
        <section className="py-24 lg:py-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 text-foreground">
                How It <span className="text-gradient">Works</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Three simple steps to reunite with your belongings
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
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
                  className="card-float p-8 lg:p-10"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <div className="mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4 shadow-cosmic">
                      <step.icon className="h-7 w-7 text-white" />
                    </div>
                    <span className="text-4xl font-bold text-primary/20">{step.step}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-card-foreground">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 lg:py-32 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 text-foreground">
                Powered by <span className="text-gradient">Innovation</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Cutting-edge technology that makes recovery simple
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                  className="group card-float p-6 lg:p-8"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-300">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold mb-2 text-card-foreground">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 lg:py-32">
          <div className="max-w-5xl mx-auto text-center px-4 sm:px-6 lg:px-8">
            <div className="card-float-elevated p-10 lg:p-16">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 text-card-foreground">
                Begin Your <span className="text-gradient">Journey</span>
              </h2>
              
              <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
                Join a community dedicated to helping people reconnect with what matters most
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                {!user ? (
                  <>
                    <Button
                      size="lg"
                      onClick={() => navigate('/auth')}
                      className="btn-modern text-lg px-10 py-6 font-semibold"
                    >
                      Join the Mission
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => navigate('/browse')}
                      className="text-lg px-10 py-6 font-semibold hover-lift"
                    >
                      Explore Now
                    </Button>
                  </>
                ) : (
                  <Button
                    size="lg"
                    onClick={() => navigate('/browse')}
                    className="btn-modern text-lg px-10 py-6 font-semibold"
                  >
                    Start Your Search
                  </Button>
                )}
              </div>

              {/* Trust Indicators */}
              <div className="pt-8 border-t border-border/50">
                <div className="flex flex-col sm:flex-row justify-center items-center gap-8 text-sm">
                  <div className="flex items-center gap-3 group">
                    <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <span className="font-medium text-foreground">Secure & Verified</span>
                  </div>
                  <div className="flex items-center gap-3 group">
                    <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Sparkles className="h-5 w-5 text-accent" />
                    </div>
                    <span className="font-medium text-foreground">AI-Enhanced</span>
                  </div>
                  <div className="flex items-center gap-3 group">
                    <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Heart className="h-5 w-5 text-primary" />
                    </div>
                    <span className="font-medium text-foreground">Community Driven</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
