import {
  useEffect,
} from "react";
import {
  Navigate,
  useParams,
} from "react-router-dom";

import { useCountry } from "../market/CountryContext";
import HomePage from "./HomePage";

export default function CountryHomePage() {
  const { countryCode: routeCountryCode } = useParams();
  const { countries, setCountryCode } = useCountry();
  const normalized = (routeCountryCode ?? "").toUpperCase();
  const exists = countries.some(country => country.code === normalized);

  useEffect(() => {
    if (exists) {
      setCountryCode(normalized);
    }
  }, [exists, normalized, setCountryCode]);

  if (!normalized || normalized.length !== 2 || !exists) {
    return <Navigate to="/" replace />;
  }

  return <HomePage />;
}
