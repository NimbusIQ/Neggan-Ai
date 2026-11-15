// Source: Google Maps Platform Code Assist
import React, { useState, useEffect, useCallback } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMapsLibrary,
  useMap,
} from '@vis.gl/react-google-maps';
import { MapPin, Search, Loader2 } from 'lucide-react';

interface LiveDealershipPlace {
  id: string;
  displayName: string;
  formattedAddress: string;
  position: { lat: number; lng: number };
  rating?: number | null;
  userRatingCount?: number | null;
}

const REGION_SEARCH_PRESETS = [
  { label: 'Dallas Auto Corridor', query: 'new car dealerships in Dallas TX', center: { lat: 32.7767, lng: -96.797 } },
  { label: 'Austin Metro Rooftops', query: 'auto dealerships in Austin TX', center: { lat: 30.2672, lng: -97.7431 } },
  { label: 'Fort Worth Motor Mile', query: 'car dealerships in Fort Worth TX', center: { lat: 32.7555, lng: -97.3308 } },
  { label: 'Houston I-45 Auto Row', query: 'new car dealerships in Houston TX', center: { lat: 29.7604, lng: -95.3698 } },
];

interface PlacesDealershipLayerProps {
  activeQuery: string;
  targetCenter: { lat: number; lng: number };
  places: LiveDealershipPlace[];
  setPlaces: React.Dispatch<React.SetStateAction<LiveDealershipPlace[]>>;
  selectedPlace: LiveDealershipPlace | null;
  setSelectedPlace: React.Dispatch<React.SetStateAction<LiveDealershipPlace | null>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setErrorMsg: React.Dispatch<React.SetStateAction<string | null>>;
}

const PlacesDealershipLayer: React.FC<PlacesDealershipLayerProps> = ({
  activeQuery,
  targetCenter,
  places,
  setPlaces,
  selectedPlace,
  setSelectedPlace,
  setLoading,
  setErrorMsg,
}) => {
  const map = useMap();
  const placesLib = useMapsLibrary('places');

  const executePlacesSearch = useCallback(
    async (searchText: string, centerCoord: { lat: number; lng: number }) => {
      if (!placesLib || !searchText.trim()) return;
      setLoading(true);
      setErrorMsg(null);

      try {
        const { places: foundPlaces } = await placesLib.Place.searchByText({
          textQuery: searchText,
          fields: ['id', 'displayName', 'formattedAddress', 'location', 'rating', 'userRatingCount'],
          maxResultCount: 10,
        });

        interface PlaceSearchItem {
          id: string;
          displayName?: string | null;
          formattedAddress?: string | null;
          location?: { lat: () => number; lng: () => number } | null;
          rating?: number | null;
          userRatingCount?: number | null;
        }

        const rawPlaces = (foundPlaces || []) as PlaceSearchItem[];
        const mapped: LiveDealershipPlace[] = rawPlaces
          .filter((p: PlaceSearchItem) => Boolean(p.location))
          .map((p: PlaceSearchItem) => ({
            id: p.id,
            displayName: p.displayName || 'Automotive Rooftop',
            formattedAddress: p.formattedAddress || '',
            position: {
              lat: p.location!.lat(),
              lng: p.location!.lng(),
            },
            rating: p.rating,
            userRatingCount: p.userRatingCount,
          }));

        setPlaces(mapped);
        if (mapped.length > 0) {
          setSelectedPlace(mapped[0]);
          map?.panTo(mapped[0].position);
          map?.setZoom(11);
        } else {
          setSelectedPlace(null);
          map?.panTo(centerCoord);
          map?.setZoom(10);
        }
      } catch (err: any) {
        console.error('Places API search error:', err);
        setErrorMsg(
          'Unable to load live dealership place data. Verify your Google Maps API key has Places API (New) and Maps JavaScript API enabled.'
        );
      } finally {
        setLoading(false);
      }
    },
    [placesLib, map, setPlaces, setSelectedPlace, setLoading, setErrorMsg]
  );

  useEffect(() => {
    void executePlacesSearch(activeQuery, targetCenter);
  }, [activeQuery, targetCenter, executePlacesSearch]);

  return (
    <>
      {places.map((place) => {
        const isSelected = selectedPlace?.id === place.id;
        return (
          <AdvancedMarker
            key={place.id}
            position={place.position}
            title={place.displayName}
            onClick={() => setSelectedPlace(place)}
          >
            <Pin
              background={isSelected ? '#2563eb' : '#0f172a'}
              borderColor={isSelected ? '#1d4ed8' : '#334155'}
              glyphColor="#ffffff"
              scale={isSelected ? 1.15 : 0.95}
            />
          </AdvancedMarker>
        );
      })}

      {selectedPlace && (
        <InfoWindow
          position={selectedPlace.position}
          pixelOffset={[0, -32]}
          onCloseClick={() => setSelectedPlace(null)}
        >
          <div className="p-1 max-w-xs text-slate-900 font-sans">
            <div className="text-[11px] text-slate-500 mb-0.5">
              Nimbus iQ DMS Prospect Rooftop
            </div>
            <h4 className="font-semibold text-sm text-slate-900 leading-snug">
              {selectedPlace.displayName}
            </h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              {selectedPlace.formattedAddress}
            </p>
            {selectedPlace.rating != null && (
              <div className="mt-2 pt-1.5 border-t border-slate-200 text-xs font-mono tabular-nums text-slate-700">
                Google Rating: {selectedPlace.rating.toFixed(1)} ({selectedPlace.userRatingCount ?? 0} reviews)
              </div>
            )}
          </div>
        </InfoWindow>
      )}
    </>
  );
};

export const TexasOperationsMap: React.FC = () => {
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '';
  const [searchInput, setSearchInput] = useState(REGION_SEARCH_PRESETS[0].query);
  const [activeQuery, setActiveQuery] = useState(REGION_SEARCH_PRESETS[0].query);
  const [targetCenter, setTargetCenter] = useState(REGION_SEARCH_PRESETS[0].center);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid'>('roadmap');
  const [places, setPlaces] = useState<LiveDealershipPlace[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<LiveDealershipPlace | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!apiKey) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <MapPin className="w-7 h-7 text-slate-400 mx-auto mb-2" />
        <h3 className="font-semibold text-sm text-slate-900">Google Maps API Key Not Configured</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
          Configure <code>VITE_GOOGLE_MAPS_API_KEY</code> in Secrets to explore live automotive dealership rooftops via Places API (New).
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Regional Dealership Rooftop &amp; Market Territory Explorer
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Live Google Maps Platform &amp; Places API (New) lookup for enterprise DMS territory deployment
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {(['roadmap', 'satellite', 'hybrid'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setMapType(type)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md capitalize transition-colors whitespace-nowrap shrink-0 ${
                mapType === type
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Search & Corridor Filter Toolbar */}
      <div className="px-5 py-3 bg-slate-50/70 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {REGION_SEARCH_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setSearchInput(preset.query);
                setActiveQuery(preset.query);
                setTargetCenter(preset.center);
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                activeQuery === preset.query
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (searchInput.trim()) setActiveQuery(searchInput.trim());
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search dealership corridor..."
            className="w-full md:w-64 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            <span>Search</span>
          </button>
        </form>
      </div>

      {errorMsg && (
        <div className="px-5 py-2.5 bg-amber-50 border-b border-amber-200 text-xs text-amber-900">
          {errorMsg}
        </div>
      )}

      {/* Map + Results Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12">
        <div className="lg:col-span-8 h-[460px] bg-slate-100">
          <APIProvider apiKey={apiKey} libraries={['marker', 'places']}>
            <Map
              mapId="DEMO_MAP_ID"
              defaultCenter={REGION_SEARCH_PRESETS[0].center}
              defaultZoom={11}
              mapTypeId={mapType}
              gestureHandling="greedy"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              style={{ width: '100%', height: '100%' }}
            >
              <PlacesDealershipLayer
                activeQuery={activeQuery}
                targetCenter={targetCenter}
                places={places}
                setPlaces={setPlaces}
                selectedPlace={selectedPlace}
                setSelectedPlace={setSelectedPlace}
                setLoading={setLoading}
                setErrorMsg={setErrorMsg}
              />
            </Map>
          </APIProvider>
        </div>

        <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-slate-200 max-h-[460px] overflow-y-auto divide-y divide-slate-100">
          <div className="px-4 py-3 bg-slate-50/70 text-xs font-semibold text-slate-800 flex items-center justify-between">
            <span>Discovered Rooftops</span>
            <span className="font-mono tabular-nums text-slate-500">{places.length} results</span>
          </div>
          {loading ? (
            <div className="p-6 text-center text-xs text-slate-500">
              Querying Google Places API (New)...
            </div>
          ) : places.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No dealership rooftops returned for this query. Try another metro corridor above.
            </div>
          ) : (
            places.map((p) => {
              const active = selectedPlace?.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPlace(p)}
                  className={`w-full text-left px-4 py-3 transition-colors ${
                    active ? 'bg-blue-50/50' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-semibold text-slate-900 truncate">{p.displayName}</div>
                  <div className="text-[11px] text-slate-500 truncate mt-0.5">{p.formattedAddress}</div>
                  {p.rating != null && (
                    <div className="text-[11px] font-mono tabular-nums text-slate-600 mt-1">
                      Rating {p.rating.toFixed(1)} · {p.userRatingCount ?? 0} reviews
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
