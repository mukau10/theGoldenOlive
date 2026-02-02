import { useCallback, useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './DeliveryRoutes.css';

const API_URL = import.meta.env.VITE_API_URL || '/api';

type Restaurant = {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
};

type DeliveryStop = {
  orderId: number;
  orderNumber: string;
  customerName: string;
  address: string;
  latitude: number;
  longitude: number;
  status: string;
  sequence: number; // 1..N
  total?: number;
};

type RouteResponse = {
  restaurant: Restaurant;
  stops: DeliveryStop[];
  orderedStopIds: number[];
  polyline: Array<[number, number]>; // [lat,lng]
  distanceKm?: number;
  durationMin?: number;
  calculatedAt: string;
  source: 'osrm' | 'straight';
};

// Fix default Leaflet marker icons (Vite bundling)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).toString(),
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).toString(),
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).toString(),
});

function createNumberedIcon(label: string, variant: 'restaurant' | 'stop') {
  return L.divIcon({
    className: '',
    html: `<div class="dr-marker ${variant}">${label}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -12],
  });
}

function FitBounds({ bounds }: { bounds: L.LatLngBounds | null }) {
  const map = useMap();
  useEffect(() => {
    if (!bounds) return;
    map.fitBounds(bounds, { padding: [30, 30] });
  }, [bounds, map]);
  return null;
}

export default function DeliveryRoutes() {
  const [data, setData] = useState<RouteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [email, setEmail] = useState('admin@thegoldenolive.be');
  const [password, setPassword] = useState('admin123');

  const fetchRoutes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_URL}/orders/routes`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.status === 401 || res.status === 403) {
        setAuthRequired(true);
      } else {
        setAuthRequired(false);
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || json?.message || 'Failed to load routes');
      setData(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load routes');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const doLogin = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || 'Login failed');
      const token = json?.data?.token;
      if (!token) throw new Error('Login failed: missing token');
      localStorage.setItem('admin_token', token);
      setAuthRequired(false);
      await fetchRoutes();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }, [email, password, fetchRoutes]);

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  const restaurantPos = useMemo<[number, number] | null>(() => {
    if (!data) return null;
    return [data.restaurant.latitude, data.restaurant.longitude];
  }, [data]);

  const bounds = useMemo(() => {
    if (!data) return null;
    const latLngs = [
      [data.restaurant.latitude, data.restaurant.longitude] as [number, number],
      ...data.stops.map((s) => [s.latitude, s.longitude] as [number, number]),
    ];
    return L.latLngBounds(latLngs.map((p) => L.latLng(p[0], p[1])));
  }, [data]);

  const routeSteps = useMemo(() => {
    if (!data) return [];
    const ordered = [...data.stops].sort((a, b) => a.sequence - b.sequence);
    return [
      {
        key: 'start',
        label: 'Start',
        title: data.restaurant.name,
        subtitle: data.restaurant.address,
      },
      ...ordered.map((s) => ({
        key: `stop-${s.orderId}`,
        label: String(s.sequence),
        title: `${s.customerName} (${s.orderNumber})`,
        subtitle: s.address,
      })),
      {
        key: 'end',
        label: 'Einde',
        title: `Terug naar ${data.restaurant.name}`,
        subtitle: data.restaurant.address,
      },
    ];
  }, [data]);

  return (
    <div className="delivery-routes-page">
      <div className="delivery-routes-container">
        <div className="delivery-routes-header">
          <h2 className="delivery-routes-title">Delivery Routes</h2>
          <div className="delivery-routes-actions">
            <button className="btn btn-warning" onClick={fetchRoutes} disabled={loading}>
              {loading ? 'Herberekenen…' : 'Herbereken route'}
            </button>
            {data?.source && (
              <span className="btn btn-outline-secondary disabled">
                Route bron: {data.source.toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {error && <div className="delivery-routes-error">{error}</div>}

        {authRequired && (
          <div className="delivery-routes-panel" style={{ marginBottom: 16 }}>
            <h5 style={{ margin: 0, fontWeight: 800, color: '#ffc107' }}>Admin login vereist</h5>
            <p style={{ marginTop: 8, marginBottom: 12, color: 'rgba(255,255,255,0.75)' }}>
              Deze prototype API is beveiligd. Log in om routes te laden.
            </p>
            <div className="row g-2">
              <div className="col-12 col-md-6">
                <label className="form-label text-white">Email</label>
                <input
                  className="form-control"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label text-white">Wachtwoord</label>
                <input
                  className="form-control"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <div className="col-12">
                <button className="btn btn-warning" onClick={doLogin} disabled={loading}>
                  {loading ? 'Inloggen…' : 'Inloggen'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="delivery-routes-layout">
          <div className="delivery-routes-map">
            {restaurantPos && data && (
              <MapContainer
                center={restaurantPos}
                zoom={13}
                scrollWheelZoom
                style={{ touchAction: 'pan-x pan-y' }}
              >
                <FitBounds bounds={bounds} />
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Restaurant */}
                <Marker
                  position={restaurantPos}
                  icon={createNumberedIcon('R', 'restaurant')}
                >
                  <Popup>
                    <strong>{data.restaurant.name}</strong>
                    <div>{data.restaurant.address}</div>
                  </Popup>
                </Marker>

                {/* Stops */}
                {data.stops
                  .slice()
                  .sort((a, b) => a.sequence - b.sequence)
                  .map((s) => (
                    <Marker
                      key={s.orderId}
                      position={[s.latitude, s.longitude]}
                      icon={createNumberedIcon(String(s.sequence), 'stop')}
                    >
                      <Popup>
                        <strong>#{s.sequence} — {s.orderNumber}</strong>
                        <div>{s.customerName}</div>
                        <div>{s.address}</div>
                        <div>Status: {s.status}</div>
                        {typeof s.total === 'number' && <div>Totaal: €{s.total.toFixed(2)}</div>}
                      </Popup>
                    </Marker>
                  ))}

                {/* Route line */}
                {data.polyline?.length > 1 && (
                  <Polyline positions={data.polyline} pathOptions={{ color: '#ffc107', weight: 5, opacity: 0.9 }} />
                )}
              </MapContainer>
            )}
          </div>

          <div className="delivery-routes-panel">
            <div className="delivery-routes-meta">
              <div>
                <strong>Stops:</strong> {data?.stops?.length ?? 0}
              </div>
              {typeof data?.distanceKm === 'number' && (
                <div>
                  <strong>Afstand:</strong> {data.distanceKm.toFixed(1)} km
                </div>
              )}
              {typeof data?.durationMin === 'number' && (
                <div>
                  <strong>Tijd:</strong> {Math.round(data.durationMin)} min
                </div>
              )}
            </div>

            <ol className="delivery-routes-list">
              {routeSteps.map((step) => (
                <li className="delivery-routes-step" key={step.key}>
                  <div className="delivery-routes-step-number">{step.label}</div>
                  <div>
                    <p className="delivery-routes-step-title">{step.title}</p>
                    <p className="delivery-routes-step-sub">{step.subtitle}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

