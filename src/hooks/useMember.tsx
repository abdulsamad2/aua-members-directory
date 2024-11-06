import { useEffect, useState } from "react";

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

  const useFetchMembers = () => {
    const [members, setMembers] = useState<Member[]>([]);
  
    useEffect(() => {
      const fetchMembers = async () => {
        try {
          const response = await fetch('https://www.animalultrasoundassociation.org/wp-json/aua/v1/members');
          const result = await response.json();
  
          // Ensure unique members by ID
         
  
          // Filter active members with a non-empty mepr_polygon_array
          const filteredMembers = result.data.filter((member: { id: string; subscription: { status: string; }; custom_fields: { mepr_polygon_array: any; };}) => {
            const polygon = member.custom_fields?.mepr_polygon_array;
            return member.subscription?.status === 'active' && polygon && polygon.length > 0;
          });
  
          setMembers(filteredMembers);
        } catch (error) {
          console.error('Error fetching members:', error);
        }
      };
  
      fetchMembers();
    }, []);
  
    return members;
  };
  
  export default useFetchMembers;
  