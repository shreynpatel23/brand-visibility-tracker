import { useState, useEffect, useCallback } from "react";
import { fetchData } from "@/utils/fetch";

interface AnalysisProgress {
  total_tasks: number;
  completed_tasks: number;
  current_task?: string;
}

interface CurrentAnalysis {
  analysisId: string;
  status: "running" | "completed" | "failed" | "cancelled";
  models: ("ChatGPT" | "Claude" | "Gemini")[];
  stages: ("TOFU" | "MOFU" | "BOFU" | "EVFU")[];
  startedAt: string;
  progress?: AnalysisProgress;
}

interface RecentAnalysis {
  analysisId: string;
  status: "running" | "completed" | "failed" | "cancelled";
  models: ("ChatGPT" | "Claude" | "Gemini")[];
  stages: ("TOFU" | "MOFU" | "BOFU" | "EVFU")[];
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
  progress?: AnalysisProgress;
}

interface AnalysisStatusData {
  isRunning: boolean;
  currentAnalysis: CurrentAnalysis | null;
  recentAnalyses: RecentAnalysis[];
}

interface UseAnalysisStatusReturn {
  isRunning: boolean;
  currentAnalysis: CurrentAnalysis | null;
  recentAnalyses: RecentAnalysis[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAnalysisStatus(
  userId: string,
  brandId: string,
  autoRefresh = true,
  refreshInterval = 10000 // 10 seconds
): UseAnalysisStatusReturn {
  const [data, setData] = useState<AnalysisStatusData>({
    isRunning: false,
    currentAnalysis: null,
    recentAnalyses: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysisStatus = useCallback(async () => {
    try {
      setError(null);
      const response = await fetchData(
        `/api/brand/${brandId}/analysis-status?userId=${userId}&brandId=${brandId}`
      );

      if (response.success) {
        setData(response.data);
      } else {
        setError(response.message || "Failed to fetch analysis status");
      }
    } catch (err) {
      console.error("Error fetching analysis status:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [userId, brandId]);

  // Initial fetch
  useEffect(() => {
    fetchAnalysisStatus();
  }, [fetchAnalysisStatus]);

  // Auto-refresh when analysis is running
  useEffect(() => {
    if (!autoRefresh || !data.isRunning) return;

    const interval = setInterval(() => {
      fetchAnalysisStatus();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, data.isRunning, refreshInterval, fetchAnalysisStatus]);

  return {
    isRunning: data.isRunning,
    currentAnalysis: data.currentAnalysis,
    recentAnalyses: data.recentAnalyses,
    loading,
    error,
    refetch: fetchAnalysisStatus,
  };
}
