import { useState, useEffect } from 'react';

const useGetLocation = () => {
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null); // Initially null
    const [isLocationFetched, setIsLocationFetched] = useState(false); // To track if the location has been fetched

    const getUserLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setUserLocation([latitude, longitude]); // Set location when available
                    setIsLocationFetched(true); // Mark as fetched
                },
                (error) => {
                    console.error('Error getting location', error);
                    // If geolocation fails or user denies, fallback to default location (London)
                    setUserLocation([51.509865, -0.118092]); // London
                    setIsLocationFetched(true); // Mark as fetched even though it’s the fallback
                }
            );
        } else {
            // If geolocation is not supported, fallback to default location (London)
            setUserLocation([51.509865, -0.118092]); // London
            setIsLocationFetched(true); // Mark as fetched
        }
    };

    useEffect(() => {
        getUserLocation(); // Fetch location once on mount
    }, []); // Empty dependency array to run once when the component mounts

    if (!isLocationFetched) {
        return null; // If location hasn't been fetched yet, return null
    }

    return userLocation; // Return location once fetched
};

export default useGetLocation;

