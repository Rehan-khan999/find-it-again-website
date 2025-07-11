import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { supabase } from '@/integrations/supabase/client';

// Declare google maps types
declare global {
  namespace google {
    namespace maps {
      class Map {
        constructor(element: HTMLElement, options: any);
        addListener(event: string, handler: Function): void;
      }
      class Marker {
        constructor(options: any);
        addListener(event: string, handler: Function): void;
      }
      class Geocoder {
        constructor();
        geocode(request: any): Promise<any>;
      }
      class Size {
        constructor(width: number, height: number);
      }
      interface MapMouseEvent {
        latLng?: {
          lat(): number;
          lng(): number;
        };
      }
    }
  }
}

interface GoogleMapProps {
  center: { lat: number; lng: number };
  zoom?: number;
  markers?: Array<{
    position: { lat: number; lng: number };
    title: string;
    type: 'lost' | 'found';
    onClick?: () => void;
  }>;
  onLocationSelect?: (location: { lat: number; lng: number; address: string }) => void;
  height?: string;
  className?: string;
}

export const GoogleMap = ({ 
  center, 
  zoom = 13, 
  markers = [], 
  onLocationSelect, 
  height = '400px',
  className = ''
}: GoogleMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initMap = async () => {
      try {
        if (!mapRef.current) return;

        // Get the API key from Supabase secrets
        const { data: secrets, error: secretError } = await supabase.functions.invoke('get-google-maps-key');
        
        if (secretError) {
          console.error('Error fetching API key:', secretError);
          setError('Failed to fetch Google Maps API key');
          return;
        }

        if (!secrets?.key) {
          setError('Google Maps API key not configured');
          return;
        }

        const loader = new Loader({
          apiKey: secrets.key,
          version: 'weekly',
          libraries: ['places', 'geometry']
        });

        const google = await loader.load();
        
        if (!mapRef.current) return;

        const map = new google.maps.Map(mapRef.current, {
          center,
          zoom,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'on' }]
            }
          ]
        });

        mapInstanceRef.current = map;

        // Add click listener for location selection
        if (onLocationSelect) {
          map.addListener('click', async (event: google.maps.MapMouseEvent) => {
            if (event.latLng) {
              const geocoder = new google.maps.Geocoder();
              try {
                const response = await geocoder.geocode({
                  location: event.latLng
                });
                
                if (response.results[0]) {
                  onLocationSelect({
                    lat: event.latLng.lat(),
                    lng: event.latLng.lng(),
                    address: response.results[0].formatted_address
                  });
                }
              } catch (error) {
                console.error('Geocoding error:', error);
                onLocationSelect({
                  lat: event.latLng.lat(),
                  lng: event.latLng.lng(),
                  address: `${event.latLng.lat().toFixed(6)}, ${event.latLng.lng().toFixed(6)}`
                });
              }
            }
          });
        }

        setIsLoaded(true);
      } catch (err) {
        console.error('Error loading Google Maps:', err);
        setError(`Failed to load Google Maps: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    };

    initMap();
  }, [center.lat, center.lng, zoom, onLocationSelect]);

  // Update markers when they change
  useEffect(() => {
    if (!isLoaded || !mapInstanceRef.current) return;

    // Clear existing markers
    // Note: In a real app, you'd want to keep track of marker instances to remove them properly
    
    markers.forEach(marker => {
      const mapMarker = new google.maps.Marker({
        position: marker.position,
        map: mapInstanceRef.current,
        title: marker.title,
        icon: {
          url: marker.type === 'lost' 
            ? 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                  <path fill="#DC2626" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
              `)
            : 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                  <path fill="#059669" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
              `),
          scaledSize: new google.maps.Size(30, 30)
        }
      });

      if (marker.onClick) {
        mapMarker.addListener('click', marker.onClick);
      }
    });
  }, [markers, isLoaded]);

  if (error) {
    return (
      <div className={`${className} bg-gray-100 border border-gray-300 rounded-lg flex items-center justify-center text-gray-500`} style={{ height }}>
        <p>Error loading map: {error}</p>
      </div>
    );
  }

  return (
    <div className={`${className} relative`} style={{ height }}>
      <div ref={mapRef} className="w-full h-full rounded-lg" />
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p>Loading map...</p>
          </div>
        </div>
      )}
    </div>
  );
};
