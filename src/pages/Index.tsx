import { useNavigate } from "react-router-dom";
import { Search, MapPin, Shield, Sparkles, Lock, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function Index() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Subtle Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5"></div>
        
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="animate-fade-in">
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-display font-bold mb-6 tracking-tight">
              Lost Something?
              <span className="block text-gradient mt-2">We'll Help You Find It</span>
            </h1>
            
            <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
              Connect with your community to reunite lost items using AI-powered matching and secure verification
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-scale-in">
              {user ? (
                <>
                  <Button
                    size="lg"
                    onClick={() => navigate('/post-lost')}
                    className="btn-modern text-lg px-10 py-6 font-medium hover-lift"
                  >
                    <Search className="mr-2 h-5 w-5" />
                    Report Lost Item
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate('/post-found')}
                    className="text-lg px-10 py-6 font-medium hover-lift"
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
                    className="btn-modern text-lg px-10 py-6 font-medium hover-lift"
                  >
                    Get Started
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate('/browse')}
                    className="text-lg px-10 py-6 font-medium hover-lift"
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
      <section className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-4">
              Simple & <span className="text-gradient">Effective</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get started in three easy steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Report Your Item",
                description: "Lost or found something? Create a detailed report with photos and location.",
                icon: MapPin
              },
              {
                step: "02",
                title: "AI Finds Matches",
                description: "Our advanced AI scans the database to find potential matches automatically.",
                icon: Sparkles
              },
              {
                step: "03",
                title: "Connect & Recover",
                description: "Get notified of matches and connect securely to reunite with your items.",
                icon: Shield
              }
            ].map((step, index) => (
              <div
                key={step.step}
                className="glass-card p-8 rounded-2xl hover-lift transition-all"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="mb-6">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4">
                    <step.icon className="h-7 w-7 text-white" />
                  </div>
                  <span className="text-4xl font-display font-bold text-muted-foreground/30">{step.step}</span>
                </div>
                <h3 className="text-xl font-display font-semibold mb-3">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-4">
              Powered by <span className="text-gradient">Advanced Technology</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Experience next-generation lost and found services
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Sparkles,
                title: "AI-Powered Matching",
                description: "Smart algorithms automatically match lost and found items based on descriptions, photos, and location data."
              },
              {
                icon: Lock,
                title: "Blockchain Verification",
                description: "Secure ownership verification using blockchain technology to ensure legitimate claims."
              },
              {
                icon: MapPin,
                title: "Smart Location Tracking",
                description: "Precise location matching helps connect items with their owners faster and more accurately."
              },
              {
                icon: Shield,
                title: "Secure Messaging",
                description: "Private and encrypted communication channels to safely discuss item details and arrange returns."
              },
              {
                icon: Search,
                title: "Photo Recognition",
                description: "Advanced image analysis technology to identify and match items visually across the database."
              },
              {
                icon: Globe,
                title: "Real-Time Alerts",
                description: "Instant notifications when potential matches are found, keeping you updated 24/7."
              }
            ].map((feature, index) => (
              <div
                key={feature.title}
                className="group p-6 rounded-2xl border border-border hover:border-primary/50 hover:bg-card/50 transition-all hover-lift"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-display font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10"></div>
        
        <div className="relative z-10 max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-6">
            Ready to Get Started?
          </h2>
          
          <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Join our community today and help reunite lost items with their owners
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {!user ? (
              <>
                <Button
                  size="lg"
                  onClick={() => navigate('/auth')}
                  className="btn-modern text-lg px-10 py-6 font-medium hover-lift"
                >
                  Join Now
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate('/browse')}
                  className="text-lg px-10 py-6 font-medium hover-lift"
                >
                  Browse Items
                </Button>
              </>
            ) : (
              <Button
                size="lg"
                onClick={() => navigate('/browse')}
                className="btn-modern text-lg px-10 py-6 font-medium hover-lift"
              >
                Start Searching
              </Button>
            )}
          </div>

          {/* Trust Indicators */}
          <div className="mt-16 pt-8 border-t border-border">
            <div className="flex flex-col sm:flex-row justify-center items-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="font-medium">100% Secure Platform</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" />
                <span className="font-medium">Privacy Protected</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="font-medium">AI-Powered Matching</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}