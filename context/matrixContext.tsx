"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { fetchData } from "@/utils/fetch";
import { BrandMatrixSummary } from "@/app/api/(brand)/brand/matrix-summary/route";

interface MatrixContextType {
  matrixData: BrandMatrixSummary[];
  loading: boolean;
  error: string | null;
  selectedPeriod: string;
  showMatrixData: boolean;
  setSelectedPeriod: (period: string) => void;
  setShowMatrixData: (show: boolean) => void;
  refreshMatrixData: () => Promise<void>;
  getMatrixDataForBrand: (brandId: string) => BrandMatrixSummary | undefined;
}

const MatrixContext = createContext<MatrixContextType | undefined>(undefined);

interface MatrixProviderProps {
  children: React.ReactNode;
  userId: string;
}

export function MatrixProvider({ children, userId }: MatrixProviderProps) {
  const [matrixData, setMatrixData] = useState<BrandMatrixSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState("30d");
  const [showMatrixData, setShowMatrixData] = useState(true);
  const [lastFetchKey, setLastFetchKey] = useState<string>("");

  const fetchMatrixData = useCallback(async () => {
    if (!userId || !showMatrixData) {
      setMatrixData([]);
      return;
    }

    const fetchKey = `${userId}-${selectedPeriod}`;

    // Skip if we already have this data
    if (fetchKey === lastFetchKey && matrixData.length > 0) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetchData(
        `/api/brand/matrix-summary?userId=${userId}&period=${selectedPeriod}`
      );
      const { data } = response;
      setMatrixData(data.brands || []);
      setLastFetchKey(fetchKey);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch matrix data";
      setError(errorMessage);
      console.error("Failed to fetch matrix data:", err);
    } finally {
      setLoading(false);
    }
  }, [userId, selectedPeriod, showMatrixData, lastFetchKey, matrixData.length]);

  const refreshMatrixData = useCallback(async () => {
    setLastFetchKey(""); // Force refresh by clearing the cache key
    await fetchMatrixData();
  }, [fetchMatrixData]);

  const getMatrixDataForBrand = useCallback(
    (brandId: string) => {
      return matrixData.find((m) => m.brandId === brandId);
    },
    [matrixData]
  );

  // Auto-fetch when dependencies change
  useEffect(() => {
    if (showMatrixData) {
      fetchMatrixData();
    } else {
      setMatrixData([]);
      setLastFetchKey("");
    }
  }, [showMatrixData, selectedPeriod, userId, fetchMatrixData]);

  // Handle period changes
  const handlePeriodChange = useCallback((period: string) => {
    setSelectedPeriod(period);
    setLastFetchKey(""); // Clear cache to force refresh
  }, []);

  // Handle show/hide toggle
  const handleShowMatrixDataChange = useCallback((show: boolean) => {
    setShowMatrixData(show);
    if (!show) {
      setMatrixData([]);
      setLastFetchKey("");
      setError(null);
    }
  }, []);

  const value: MatrixContextType = {
    matrixData,
    loading,
    error,
    selectedPeriod,
    showMatrixData,
    setSelectedPeriod: handlePeriodChange,
    setShowMatrixData: handleShowMatrixDataChange,
    refreshMatrixData,
    getMatrixDataForBrand,
  };

  return (
    <MatrixContext.Provider value={value}>{children}</MatrixContext.Provider>
  );
}

export function useMatrix() {
  const context = useContext(MatrixContext);
  if (context === undefined) {
    console.error(
      "useMatrix called outside of MatrixProvider. Component tree:",
      new Error().stack
    );
    throw new Error(
      "useMatrix must be used within a MatrixProvider. Make sure the component is wrapped with MatrixProvider."
    );
  }
  return context;
}

// Hook for components that only need to read matrix data for a specific brand
export function useBrandMatrix(brandId: string) {
  const { getMatrixDataForBrand, loading, error, showMatrixData } = useMatrix();

  return {
    matrixData: getMatrixDataForBrand(brandId),
    loading: showMatrixData ? loading : false,
    error: showMatrixData ? error : null,
    hasData: showMatrixData,
  };
}

// Hook to refresh matrix data (useful for triggering refresh after analysis completion)
export function useMatrixRefresh() {
  const { refreshMatrixData } = useMatrix();
  return refreshMatrixData;
}
