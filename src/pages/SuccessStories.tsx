import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Story {
  id: string;
  title: string;
  description: string;
  location: string;
  date: string;
  category: string;
  photos: string[];
}

const stories: Story[] = [
  {
    id: '1',
    title: 'Lost Phone Reunited in Central Park',
    description: 'Thanks to FindIt, John and Maria connected and reunited a lost iPhone within 24 hours.',
    location: 'New York, USA',
    date: '2025-06-21',
    category: 'Electronics',
    photos: ['/placeholder.svg'],
  },
  {
    id: '2',
    title: 'Wedding Ring Found After a Week',
    description: 'A kind stranger posted a found ring; owner verified with a unique inscription question.',
    location: 'London, UK',
    date: '2025-05-02',
    category: 'Jewelry',
    photos: ['/placeholder.svg'],
  },
];

const SuccessStories = () => {
  useEffect(() => {
    // SEO
    document.title = 'Success Stories – FindIt Lost & Found';
    const desc = 'Real success stories of recovered lost and found items with photos.';

    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('name', name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };
    setMeta('description', desc);

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.href = window.location.origin + '/success-stories';
  }, []);

  return (
    <main>
      <section className="bg-background">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <h1 className="text-3xl font-bold mb-2">Success Stories</h1>
          <p className="text-muted-foreground mb-8">Real recoveries from our community.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {stories.map((s) => (
              <article key={s.id} className="contents">
                <Card className="overflow-hidden">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{s.title}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{s.category}</Badge>
                        <Badge variant="secondary">{new Date(s.date).toLocaleDateString()}</Badge>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {s.photos?.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        {s.photos.map((src, i) => (
                          <img
                            key={i}
                            src={src}
                            loading="lazy"
                            alt={`${s.title} photo ${i + 1}`}
                            className="w-full h-32 object-cover rounded-md border"
                          />
                        ))}
                      </div>
                    )}
                    <p className="text-sm text-foreground mb-3">{s.description}</p>
                    <p className="text-xs text-muted-foreground">Location: {s.location}</p>
                  </CardContent>
                </Card>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
};

export default SuccessStories;
