"use client";

import React, { useState } from "react";
import {
  Filter,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Target,
  Activity,
  Building2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MatrixData {
  model: string;
  stage: "TOFU" | "MOFU" | "BOFU" | "EVFU";
  score: number;
  prompts: number;
  avgResponseTime: number;
  successRate: number;
  trend: "up" | "down" | "neutral";
  trendPercentage: number;
}

const MatrixPage: React.FC = () => {
  const [selectedModel, setSelectedModel] = useState("all");
  const [selectedStage, setSelectedStage] = useState("all");
  const [dateRange, setDateRange] = useState("7days");

  // Mock matrix data
  const matrixData: MatrixData[] = [
    {
      model: "ChatGPT",
      stage: "TOFU",
      score: 87,
      prompts: 45,
      avgResponseTime: 1.2,
      successRate: 94,
      trend: "up",
      trendPercentage: 12,
    },
    {
      model: "ChatGPT",
      stage: "MOFU",
      score: 82,
      prompts: 38,
      avgResponseTime: 1.4,
      successRate: 91,
      trend: "up",
      trendPercentage: 8,
    },
    {
      model: "ChatGPT",
      stage: "BOFU",
      score: 79,
      prompts: 32,
      avgResponseTime: 1.6,
      successRate: 89,
      trend: "down",
      trendPercentage: 3,
    },
    {
      model: "ChatGPT",
      stage: "EVFU",
      score: 91,
      prompts: 28,
      avgResponseTime: 1.1,
      successRate: 96,
      trend: "up",
      trendPercentage: 15,
    },
    {
      model: "Claude",
      stage: "TOFU",
      score: 85,
      prompts: 42,
      avgResponseTime: 1.3,
      successRate: 93,
      trend: "up",
      trendPercentage: 10,
    },
    {
      model: "Claude",
      stage: "MOFU",
      score: 88,
      prompts: 35,
      avgResponseTime: 1.2,
      successRate: 95,
      trend: "up",
      trendPercentage: 14,
    },
    {
      model: "Claude",
      stage: "BOFU",
      score: 84,
      prompts: 30,
      avgResponseTime: 1.5,
      successRate: 92,
      trend: "neutral",
      trendPercentage: 2,
    },
    {
      model: "Claude",
      stage: "EVFU",
      score: 89,
      prompts: 25,
      avgResponseTime: 1.0,
      successRate: 97,
      trend: "up",
      trendPercentage: 18,
    },
    {
      model: "Gemini",
      stage: "TOFU",
      score: 81,
      prompts: 40,
      avgResponseTime: 1.4,
      successRate: 90,
      trend: "down",
      trendPercentage: 5,
    },
    {
      model: "Gemini",
      stage: "MOFU",
      score: 76,
      prompts: 33,
      avgResponseTime: 1.6,
      successRate: 87,
      trend: "down",
      trendPercentage: 8,
    },
    {
      model: "Gemini",
      stage: "BOFU",
      score: 73,
      prompts: 28,
      avgResponseTime: 1.8,
      successRate: 85,
      trend: "down",
      trendPercentage: 12,
    },
    {
      model: "Gemini",
      stage: "EVFU",
      score: 78,
      prompts: 22,
      avgResponseTime: 1.5,
      successRate: 88,
      trend: "neutral",
      trendPercentage: 1,
    },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    if (score >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  const getScoreTextColor = (score: number) => {
    if (score >= 80) return "text-green-700 dark:text-green-400";
    if (score >= 60) return "text-yellow-700 dark:text-yellow-400";
    if (score >= 40) return "text-orange-700 dark:text-orange-400";
    return "text-red-700 dark:text-red-400";
  };

  const getTrendIcon = (trend: "up" | "down" | "neutral") => {
    switch (trend) {
      case "up":
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case "down":
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTrendColor = (trend: "up" | "down" | "neutral") => {
    switch (trend) {
      case "up":
        return "text-green-600 dark:text-green-400";
      case "down":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  const filteredData = matrixData.filter((item) => {
    if (selectedModel !== "all" && item.model.toLowerCase() !== selectedModel) {
      return false;
    }
    if (selectedStage !== "all" && item.stage !== selectedStage) {
      return false;
    }
    return true;
  });

  const stages = ["TOFU", "MOFU", "BOFU", "EVFU"];
  const models = ["ChatGPT", "Claude", "Gemini"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Performance Matrix
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Detailed performance analysis across AI models and funnel stages
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center space-x-4">
          <Filter className="w-5 h-5 text-gray-400" />
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Model
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="text-sm border border-input rounded-md px-3 py-2 bg-background text-foreground"
              >
                <option value="all">All Models</option>
                <option value="chatgpt">ChatGPT</option>
                <option value="claude">Claude</option>
                <option value="gemini">Gemini</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Stage
              </label>
              <select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className="text-sm border border-input rounded-md px-3 py-2 bg-background text-foreground"
              >
                <option value="all">All Stages</option>
                <option value="TOFU">TOFU</option>
                <option value="MOFU">MOFU</option>
                <option value="BOFU">BOFU</option>
                <option value="EVFU">EVFU</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Period
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="text-sm border border-input rounded-md px-3 py-2 bg-background text-foreground"
              >
                <option value="7days">Last 7 days</option>
                <option value="30days">Last 30 days</option>
                <option value="90days">Last 90 days</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Matrix Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Performance Matrix
          </h3>

          {/* Table Header */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Model
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Stage
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Score
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Prompts
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Avg Response
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Success Rate
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Trend
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item, index) => (
                  <tr
                    key={`${item.model}-${item.stage}`}
                    className={`border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                      index % 2 === 0 ? "bg-gray-50/50 dark:bg-gray-800/50" : ""
                    }`}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mr-3">
                          <Activity className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {item.model}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                        {item.stage}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center">
                        <div className="flex items-center">
                          <div
                            className={`w-3 h-3 rounded-full mr-2 ${getScoreColor(
                              item.score
                            )}`}
                          />
                          <span
                            className={`font-semibold ${getScoreTextColor(
                              item.score
                            )}`}
                          >
                            {item.score}%
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-gray-900 dark:text-white font-medium">
                        {item.prompts}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-gray-900 dark:text-white">
                        {item.avgResponseTime}s
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-gray-900 dark:text-white font-medium">
                        {item.successRate}%
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div
                        className={`flex items-center justify-center space-x-1 ${getTrendColor(
                          item.trend
                        )}`}
                      >
                        {getTrendIcon(item.trend)}
                        <span className="text-sm font-medium">
                          {item.trendPercentage}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Best Performing
              </h3>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                Claude - EVFU
              </p>
              <p className="text-sm text-green-600 dark:text-green-400">
                97% Success Rate
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Prompts
              </h3>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {filteredData.reduce((sum, item) => sum + item.prompts, 0)}
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                Across all models
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Avg Response Time
              </h3>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {(
                  filteredData.reduce(
                    (sum, item) => sum + item.avgResponseTime,
                    0
                  ) / filteredData.length
                ).toFixed(1)}
                s
              </p>
              <p className="text-sm text-purple-600 dark:text-purple-400">
                Overall average
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatrixPage;
