import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { apiRequest } from "../api/client";
import type { Country } from "../types/location";

const STORAGE_KEY = "market_country_code";
const FALLBACK_COUNTRY: Country = {
  code: "BI",
  name: "Burundi",
  currency: "BIF",
  phone_prefix: "+257",
  default_language: "fr",
  active: true,
  sort_order: 0,
};

type CountryContextType = {
  countries: Country[];
  currentCountry: Country;
  countryCode: string;
  currency: string;
  loading: boolean;
  setCountryCode: (code: string) => void;
};

const CountryContext = createContext<CountryContextType | undefined>(undefined);

export function CountryProvider({ children }: { children: ReactNode }) {
  const [countries, setCountries] = useState<Country[]>([FALLBACK_COUNTRY]);
  const [countryCode, setCountryCodeState] = useState(() => (
    localStorage.getItem(STORAGE_KEY) || FALLBACK_COUNTRY.code
  ));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    apiRequest<Country[]>("/administrative-areas/countries")
      .then(items => {
        if (!mounted) {
          return;
        }

        const activeCountries = items.length > 0 ? items : [FALLBACK_COUNTRY];
        const selectedExists = activeCountries.some(country => country.code === countryCode);

        setCountries(activeCountries);

        if (!selectedExists) {
          const nextCode = activeCountries[0]?.code ?? FALLBACK_COUNTRY.code;
          setCountryCodeState(nextCode);
          localStorage.setItem(STORAGE_KEY, nextCode);
        }
      })
      .catch(() => {
        if (mounted) {
          setCountries([FALLBACK_COUNTRY]);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [countryCode]);

  const currentCountry = useMemo(
    () => countries.find(country => country.code === countryCode) ?? countries[0] ?? FALLBACK_COUNTRY,
    [countries, countryCode],
  );

  function setCountryCode(code: string) {
    const normalized = code.toUpperCase();
    setCountryCodeState(normalized);
    localStorage.setItem(STORAGE_KEY, normalized);
  }

  return (
    <CountryContext.Provider
      value={{
        countries,
        currentCountry,
        countryCode: currentCountry.code,
        currency: currentCountry.currency,
        loading,
        setCountryCode,
      }}
    >
      {children}
    </CountryContext.Provider>
  );
}

export function useCountry() {
  const context = useContext(CountryContext);

  if (!context) {
    throw new Error("useCountry must be used within CountryProvider");
  }

  return context;
}
