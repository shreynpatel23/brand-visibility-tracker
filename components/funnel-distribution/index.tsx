"use client";

import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface FunnelDistributionData {
  stages: string[];
  models: string[];
  matrix: Array<{
    stage: string;
    model: string;
    score: number;
    weightedScore: number;
    analyses: number;
    performance_level: "excellent" | "good" | "fair" | "poor";
    trend: "up" | "down" | "neutral";
    confidence: number;
  }>;
}

interface FunnelDistributionProps {
  data: FunnelDistributionData;
  title?: string;
  compact?: boolean;
}

const FunnelDistribution: React.FC<FunnelDistributionProps> = ({
  data,
  title = "Funnel Performance Distribution",
  compact = false,
}) => {
  // Helper functions
  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-green-400";
    if (score >= 40) return "bg-yellow-400";
    return "bg-red-400";
  };

  const getScoreTextColor = (score: number) => {
    if (score >= 80) return "text-green-700 dark:text-green-400";
    if (score >= 60) return "text-green-600 dark:text-green-400";
    if (score >= 40) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getTrendIcon = (trend: "up" | "down" | "neutral") => {
    switch (trend) {
      case "up":
        return <TrendingUp className="w-3 h-3 text-green-500" />;
      case "down":
        return <TrendingDown className="w-3 h-3 text-red-500" />;
      default:
        return <Minus className="w-3 h-3 text-gray-500" />;
    }
  };

  // Calculate stage averages
  const stageAverages = data.stages.map((stage) => {
    const stageData = data.matrix.filter((item) => item.stage === stage);
    const avgScore =
      stageData.length > 0
        ? stageData.reduce((sum, item) => sum + item.weightedScore, 0) /
          stageData.length
        : 0;
    const totalAnalyses = stageData.reduce(
      (sum, item) => sum + item.analyses,
      0
    );

    // Determine overall trend for stage
    const upTrends = stageData.filter((item) => item.trend === "up").length;
    const downTrends = stageData.filter((item) => item.trend === "down").length;
    const overallTrend: "up" | "down" | "neutral" =
      upTrends > downTrends ? "up" : downTrends > upTrends ? "down" : "neutral";

    return {
      stage,
      avgScore: Math.round(avgScore * 100) / 100,
      totalAnalyses,
      overallTrend,
      modelData: stageData,
    };
  });

  if (compact) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
          {title}
        </h3>
        <div className="space-y-3">
          {stageAverages.map((stageData) => (
            <div
              key={stageData.stage}
              className="flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                <div className="w-12 text-sm font-medium text-gray-600 dark:text-gray-400">
                  {stageData.stage}
                </div>
                <div className="flex-1">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${getScoreColor(
                        stageData.avgScore
                      )}`}
                      style={{ width: `${stageData.avgScore}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span
                  className={`text-sm font-semibold ${getScoreTextColor(
                    stageData.avgScore
                  )}`}
                >
                  {stageData.avgScore}%
                </span>
                {getTrendIcon(stageData.overallTrend)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h3>
        <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
          Weighted Scores by Stage
        </span>
      </div>

      <div className="space-y-6">
        {stageAverages.map((stageData) => (
          <div key={stageData.stage} className="space-y-3">
            {/* Stage Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <h4 className="text-md font-medium text-gray-900 dark:text-white">
                  {stageData.stage}
                </h4>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  ({stageData.totalAnalyses} analyses)
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span
                  className={`text-lg font-bold ${getScoreTextColor(
                    stageData.avgScore
                  )}`}
                >
                  {stageData.avgScore}%
                </span>
                {getTrendIcon(stageData.overallTrend)}
              </div>
            </div>

            {/* Stage Progress Bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className={`h-3 rounded-full ${getScoreColor(
                  stageData.avgScore
                )}`}
                style={{ width: `${stageData.avgScore}%` }}
              />
            </div>

            {/* Model Breakdown */}
            <div className="grid grid-cols-3 gap-2 ml-4">
              {stageData.modelData.map((modelData) => (
                <div
                  key={`${stageData.stage}-${modelData.model}`}
                  className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm"
                >
                  <span className="text-gray-600 dark:text-gray-400">
                    {modelData.model}
                  </span>
                  <div className="flex items-center space-x-1">
                    <span
                      className={`font-medium ${getScoreTextColor(
                        modelData.weightedScore
                      )}`}
                    >
                      {modelData.weightedScore}%
                    </span>
                    {getTrendIcon(modelData.trend)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Scores are weighted based on brand mention position and stage-specific
          factors
        </p>
      </div>
    </div>
  );
};

export default FunnelDistribution;
