import React, { useState, useEffect, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Loader2, MapPin, Phone, Mail, } from 'lucide-react'
import { Input } from "./components/ui/input"
import { Button } from "./components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "./components/ui/avatar"
import { Badge } from "./components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./components/ui/tooltip"
import useFetchMembers from './hooks/useMember'
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
});

L.Marker.prototype.options.icon = DefaultIcon;
interface Member {
  id: string
  email: string
  username: string
  avatar_url: string
  profile_url: string
  custom_fields: {
    first_name: string
    last_name: string
    mepr_business_trading_name: string
    mepr_contact_number: string
    'mepr-address-city': string
    'mepr-address-state': string
    'mepr-address-zip': string
    'mepr-address-country': string
    mepr_polygon_array: { lat: number; lng: number }[]
  }
  subscription: {
    status: string
    product_id: string
  }
  formatted_address: string
  full_name: string
  distance?: number
}

const calculatePolygonCenter = (polygon: { lat: number; lng: number }[]) => {
  if (!Array.isArray(polygon) || polygon.length === 0 || !polygon[0].lat || !polygon[0].lng) {
    return { lat: 0, lng: 0 }
  }
  const latSum = polygon.reduce((sum, point) => sum + point.lat, 0)
  const lngSum = polygon.reduce((sum, point) => sum + point.lng, 0)
  return {
    lat: latSum / polygon.length,
    lng: lngSum / polygon.length,
  }
}

const MapUpdater: React.FC<{ center: L.LatLngExpression; zoom: number }> = ({ center, zoom }) => {
  const map = useMap()
  map.setView(center, zoom)
  return null
}

const UKMemberMap: React.FC = () => {
  const members = useFetchMembers()
  const [searchQuery, setSearchQuery] = useState('')
  const [mapCenter, setMapCenter] = useState<L.LatLngExpression>([54.5, -4])
  const [mapZoom, setMapZoom] = useState(8)
  const [closestMembers, setClosestMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(false)
  const [userLocation, setUserLocation] = useState<L.LatLngExpression | null>(null)
  const [locationName, setLocationName] = useState('');

  const mapRef = useRef<L.Map>(null)
  const findClosestMembers = useCallback((location: L.LatLngExpression) => {
    const membersWithDistance = members.map((member) => {
      const memberCenter = calculatePolygonCenter(member.custom_fields.mepr_polygon_array);
      const distance = L.latLng(location).distanceTo(L.latLng(memberCenter.lat, memberCenter.lng));
      return { ...member, distance };
    });

    const sortedMembers = membersWithDistance.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    setClosestMembers(sortedMembers.slice(0, 6));
  }, [members, calculatePolygonCenter]);


  useEffect(() => {
    const getUserLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords
            setUserLocation([latitude, longitude])
            findClosestMembers([latitude, longitude])
          },
          (error) => {
            console.error('Error getting location', error)
            // Fallback to default location if geolocation fails
            setUserLocation([51.509865, -0.118092]) // London
          }
        )
      } else {
        // Fallback to default location if geolocation is not supported
        setUserLocation([51.509865, -0.118092]) // London
      }
    }

    getUserLocation()
  }, [findClosestMembers])

  useEffect(() => {
    if (userLocation) {
      setMapCenter(userLocation)
      setMapZoom(8)
    }
  }, [userLocation])


  useEffect(() => {
    const fetchLocationName = async () => {
      try {
        const response = await fetch(
          //@ts-ignore
          `https://nominatim.openstreetmap.org/reverse?lat=${userLocation[0]}&lon=${userLocation[1]}&format=json`
        );
        const data = await response.json();
        const cityName = data.address.city || data.address.town || data.address.village || "Unknown location";
        setLocationName(cityName);
      } catch (error) {
        console.error("Error fetching location name:", error);
        setLocationName(() => 'location not found');
      }
    };

    if (userLocation) {
      fetchLocationName();
    }
  }, [userLocation]);

  const handleSearch = async () => {
    setLocationName(searchQuery)
    setLoading(true)
    if (!searchQuery.trim()) {
      setLoading(false)
      return
    }

    try {
      const isPostcode = searchQuery.match(/^[A-Z0-9]{1,4} [A-Z0-9]{1,4}$/i)
      let searchUrl = ''

      if (isPostcode) {
        searchUrl = `https://api.postcodes.io/postcodes/${searchQuery}`
      } else {
        searchUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${searchQuery}`
      }

      const response = await fetch(searchUrl)
      const data = await response.json()

      let newCenter: L.LatLngExpression

      if (isPostcode && data.status === 200) {
        const { latitude, longitude, } = data.result
        newCenter = [latitude, longitude]
      } else if (!isPostcode && data[0]) {
        const { lat, lon } = data[0]
        newCenter = [parseFloat(lat), parseFloat(lon)]
      } else {
        throw new Error('Invalid postcode or location')
      }

      setMapCenter(newCenter)
      setMapZoom(8)
      findClosestMembers(newCenter)
    } catch (error) {
      console.error('Error searching location:', error)
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="container md:fixed mx-auto p-4 h-screen">
      <h1 className="text-4xl font-bold mb-8 text-center text-primary">UK Member Map</h1>
      <div className="mb-8 flex flex-col sm:flex-row items-center justify-center">
        <Input
          type="text"
          placeholder="Enter UK postcode or location"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="mb-2 sm:mb-0 sm:mr-2 w-full sm:w-64"
        />
        <Button onClick={handleSearch} disabled={loading} className="w-full sm:w-auto">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
          {loading ? 'Searching...' : 'Search'}
        </Button>
      </div>
     <div className="flex flex-col lg:flex-row gap-5 h-full">
      {/* Map Section */}
      <div className="w-full lg:w-1/2 h-full order-2 lg:order-1">
        <Card className="w-full h-full bg-gray-200">
          <CardContent className="p-0">
            <div className="h-[300px] sm:h-[400px] md:h-[600px] lg:h-[700px]">
              <MapContainer
                center={mapCenter}
                zoom={mapZoom}
                className="w-full h-full"
                ref={mapRef}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                {members.map((member) => {
                  const center = calculatePolygonCenter(member.custom_fields.mepr_polygon_array);
                  return (
                    <Marker key={member.id} position={[center.lat, center.lng]}>
                      <Popup>
                        <div>
                          <h3 className="font-bold">{member.custom_fields.mepr_business_trading_name}</h3>
                          <p>{member.formatted_address}</p>
                          <a
                            href={member.profile_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline"
                          >
                            View Profile
                          </a>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
                {userLocation && (
                  <Marker position={userLocation}>
                    <Popup>Your Location</Popup>
                  </Marker>
                )}
                <MapUpdater center={mapCenter} zoom={mapZoom} />
              </MapContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Closest Members Section */}
      <div className="w-full lg:w-1/2 md:overflow-y-auto h-full order-2 lg:order-2">
        <div className="flex flex-col items-center justify-center py-4">
          <h2 className="text-2xl font-semibold mb-4 text-primary">Closest Members</h2>
          {userLocation && (
            <p className="text-sm text-muted-foreground mb-4">
              Your location: {locationName || 'Unknown location'}
            </p>
          )}
        </div>
        <AnimatePresence>
          {closestMembers.length > 0 ? (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {closestMembers.slice(0, 6).map((member, index) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
                    <CardHeader className="pb-2">
                      <div className="flex items-center space-x-4">
                        <Avatar>
                          <AvatarImage src={member.avatar_url} alt={member.full_name} />
                          <AvatarFallback>{member.full_name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg font-semibold">{member.custom_fields.mepr_business_trading_name}</CardTitle>
                          <CardDescription>{member.full_name}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center text-sm">
                          <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span>{member.formatted_address}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span>{member.custom_fields.mepr_contact_number}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span>{member.email}</span>
                        </div>
                      </div>
                      <div className="mt-4 flex justify-between items-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge
                                variant="secondary"
                                className="text-xs bg-gray-100 text-gray-800 p-2 rounded-md shadow-md hover:bg-gray-200"
                              >
                                {member.distance
                                  ? `${(member.distance / 1000).toFixed(1)} km from ${locationName}`
                                  : 'Distance N/A'}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent
                              className="bg-black text-white p-3 rounded-md shadow-lg text-sm transition-opacity duration-300 ease-in-out"
                              side="top"
                              align="center"
                            >
                              <p>Location distance</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <Button size="sm" asChild>
                          <a href={member.profile_url} target="_blank" rel="noopener noreferrer">View Profile</a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            // Loading Spinner with Skeleton
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-12 w-12 animate-spin" />
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
    </div>
  );

}

export default UKMemberMap