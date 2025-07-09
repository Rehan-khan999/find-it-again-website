import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Map } from 'lucide-react';
import { GoogleMap } from './GoogleMap';

interface LocationSelectorProps {
  onLocationSelect: (location: { address: string; lat: number; lng: number }) => void;
  initialLocation?: string;
  initialCoords?: { lat: number; lng: number };
}

export const LocationSelector = ({ 
  onLocationSelect, 
  initialLocation = '', 
  initialCoords 
}: LocationSelectorProps) => {
  const [showMap, setShowMap] = useState(false);
  const [address, setAddress] = useState(initialLocation);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(
    initialCoords || null
  );

  const handleLocationSelect = (location: { lat: number; lng: number; address: string }) => {
    setAddress(location.address);
    setCoordinates({ lat: location.lat, lng: location.lng });
    onLocationSelect(location);
    setShowMap(false);
  };

  const handleAddressChange = (value: string) => {
    setAddress(value);
    // For now, just pass the address without coordinates
    onLocationSelect({ address: value, lat: 0, lng: 0 });
  };

  const defaultCenter = coordinates || { lat: 40.7128, lng: -74.0060 }; // New York City default

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="location">Location *</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              id="location"
              placeholder="Enter address or location"
              value={address}
              onChange={(e) => handleAddressChange(e.target.value)}
              className="pl-10"
              required
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowMap(!showMap)}
            className="px-3"
          >
            <Map className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {showMap && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                Click on the map to select a location
              </div>
              <GoogleMap
                center={defaultCenter}
                zoom={13}
                onLocationSelect={handleLocationSelect}
                height="300px"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {coordinates && coordinates.lat !== 0 && coordinates.lng !== 0 && (
        <div className="text-xs text-gray-500">
          Coordinates: {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
        </div>
      )}
    </div>
  );
};