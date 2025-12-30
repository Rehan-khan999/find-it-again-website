import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, Sparkles, Heart, Zap, MapPin, Calendar, Info } from "lucide-react";

// Import demo images
import lostHeartImg from "@/assets/demo/lost-heart.png";
import pkRemote1 from "@/assets/demo/pk-remote-1.jpg";
import pkRemote2 from "@/assets/demo/pk-remote-2.jpg";
import pkRemote3 from "@/assets/demo/pk-remote-3.jpg";

interface DemoItem {
  id: string;
  title: string;
  category: string;
  description: string;
  location: string;
  date: string;
  photos: string[];
  icon: React.ReactNode;
}

const DEMO_ITEMS: DemoItem[] = [
  {
    id: "demo-lost-heart",
    title: "Lost Heart ❤️",
    category: "Demo / Sample",
    description: `Dil kho gaya hai 💔

Lagta hai galti se galat insaan ko de diya.
Ab dhadak to raha hai,
par owner ke paas nahi.

Agar kisi ko kahin pada hua mile —
thoda sambhal ke rakhna,
soft hai, thoda sa cracked hai,
par pyaar abhi bhi kaam karta hai 😌

📌 This is a demo listing added only for fun and UI demonstration.`,
    location: "Somewhere in the World of Feelings",
    date: "Since Forever",
    photos: [lostHeartImg],
    icon: <Heart className="w-4 h-4" />,
  },
  {
    id: "demo-pk-remote",
    title: "PK's Remote",
    category: "Demo / Sample",
    description: `Hamra remotwa kho gaya hai 😔

Ham dusre gola se aaye hain,
aur is remotwa se PK insaano ka confusion on–off karta tha.

Galti se Earth par kahin gir gaya jab PK
logon ke system, rules aur emotions samajhne me busy tha.

📌 This is a fictional demo item added for presentation purposes only.`,
    location: "Earth (Somewhere near Rajasthan)",
    date: "2014",
    photos: [pkRemote1, pkRemote2, pkRemote3],
    icon: <Zap className="w-4 h-4" />,
  },
];

export const DemoListings = () => {
  const [selectedItem, setSelectedItem] = useState<DemoItem | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const handleViewItem = (item: DemoItem) => {
    setSelectedItem(item);
    setCurrentPhotoIndex(0);
  };

  return (
    <div className="mb-12">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-amber-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            Demo / Sample Listings
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/10">
              FOR FUN
            </Badge>
          </h2>
          <p className="text-sm text-muted-foreground">
            These items are fictional and added for UI demonstration only
          </p>
        </div>
      </div>

      {/* Demo Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {DEMO_ITEMS.map((item) => (
          <Card 
            key={item.id}
            className="group overflow-hidden border-2 border-dashed border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5 hover:border-amber-500/50 transition-all duration-300"
          >
            {/* Demo Badge Ribbon */}
            <div className="absolute top-3 right-3 z-10">
              <Badge className="bg-amber-500 hover:bg-amber-600 text-white shadow-lg gap-1.5">
                <Info className="w-3 h-3" />
                DEMO
              </Badge>
            </div>

            {/* Thumbnail Image */}
            <div className="w-full h-48 overflow-hidden relative">
              <img 
                src={item.photos[0]} 
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
              
              {/* Photo count badge */}
              {item.photos.length > 1 && (
                <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md">
                  +{item.photos.length - 1} more
                </div>
              )}
            </div>
            
            {/* Card Header */}
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg mb-3 font-semibold group-hover:text-amber-500 transition-colors line-clamp-1 flex items-center gap-2">
                    {item.icon}
                    {item.title}
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/10">
                      {item.category}
                    </Badge>
                    <Badge variant="secondary" className="text-xs opacity-60">
                      Fictional
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>

            {/* Card Content */}
            <CardContent className="pt-0">
              <CardDescription className="mb-4 line-clamp-3 group-hover:text-foreground/80 transition-colors whitespace-pre-line">
                {item.description.split('\n')[0]}...
              </CardDescription>
              
              {/* Item Details */}
              <div className="space-y-2.5 text-sm text-muted-foreground">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <span className="truncate">{item.location}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <span>{item.date}</span>
                </div>
              </div>
              
              {/* View Button */}
              <div className="mt-5 pt-4 border-t border-amber-500/20">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleViewItem(item)}
                  className="w-full border-amber-500/30 hover:bg-amber-500/10 hover:border-amber-500/50 transition-all"
                >
                  <Eye className="w-4 h-4 mr-1.5" />
                  View Demo Item
                </Button>
              </div>
              
              {/* Disclaimer */}
              <p className="text-[10px] text-muted-foreground/60 mt-3 text-center italic">
                ⚠️ Not a real listing • Cannot be claimed
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Demo Item Detail Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-amber-500 text-white">
                <Info className="w-3 h-3 mr-1" />
                DEMO ITEM
              </Badge>
              <Badge variant="outline" className="text-amber-600 border-amber-500/50">
                Fictional / Non-Claimable
              </Badge>
            </div>
            <DialogTitle className="text-2xl flex items-center gap-2">
              {selectedItem?.icon}
              {selectedItem?.title}
            </DialogTitle>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-6">
              {/* Photo Gallery */}
              <div className="space-y-3">
                <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                  <img 
                    src={selectedItem.photos[currentPhotoIndex]} 
                    alt={selectedItem.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {selectedItem.photos.length > 1 && (
                  <div className="flex gap-2 justify-center">
                    {selectedItem.photos.map((photo, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentPhotoIndex(index)}
                        className={`w-16 h-16 rounded-md overflow-hidden border-2 transition-all ${
                          currentPhotoIndex === index 
                            ? 'border-amber-500 ring-2 ring-amber-500/30' 
                            : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img 
                          src={photo} 
                          alt={`${selectedItem.title} ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Description</h4>
                  <p className="text-muted-foreground whitespace-pre-line text-sm leading-relaxed">
                    {selectedItem.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
                      <MapPin className="w-4 h-4" />
                      <span className="text-xs font-medium">Location</span>
                    </div>
                    <p className="text-sm text-foreground">{selectedItem.location}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
                      <Calendar className="w-4 h-4" />
                      <span className="text-xs font-medium">Date</span>
                    </div>
                    <p className="text-sm text-foreground">{selectedItem.date}</p>
                  </div>
                </div>
              </div>

              {/* Disclaimer Banner */}
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-center">
                <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                  🎭 This is a demo/sample listing for UI demonstration purposes only.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  This item cannot be claimed, reported, or edited. It exists purely for fun and to showcase the platform's features.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
