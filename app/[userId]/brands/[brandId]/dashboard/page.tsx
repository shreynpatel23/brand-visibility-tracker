"use client";
import React, { useState } from "react";
import {
  Plus,
  Filter,
  TrendingUp,
  TrendingDown,
  Minus,
  Building2,
  BarChart3,
  Activity,
  Target,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";

interface Brand {
  id: string;
  name: string;
  category: string;
  region: string;
  scores: {
    TOFU: number;
    MOFU: number;
    BOFU: number;
    EVFU: number;
  };
  sentiment: {
    trend: "up" | "down" | "neutral";
    percentage: number;
    distribution: {
      positive: number;
      neutral: number;
      negative: number;
      stronglyPositive: number;
    };
  };
  metrics: {
    totalPrompts: number;
    avgResponseTime: number;
    successRate: number;
    lastUpdated: string;
  };
  weeklyData: {
    labels: string[];
    scores: number[];
    prompts: number[];
  };
  modelPerformance: {
    ChatGPT: { score: number; prompts: number };
    Claude: { score: number; prompts: number };
    Gemini: { score: number; prompts: number };
  };
}

const DashboardPage: React.FC = () => {
  const [selectedBrandId, setSelectedBrandId] = useState("1");
  const [selectedModel, setSelectedModel] = useState("all");
  const [selectedStage, setSelectedStage] = useState("all");
  const [dateRange, setDateRange] = useState("7days");

  // Mock data
  const brands: Brand[] = [
    {
      id: "1",
      name: "TechCorp",
      category: "Technology",
      region: "North America",
      scores: { TOFU: 85, MOFU: 72, BOFU: 68, EVFU: 91 },
      sentiment: {
        trend: "up",
        percentage: 12,
        distribution: {
          positive: 45,
          neutral: 35,
          negative: 15,
          stronglyPositive: 5,
        },
      },
      metrics: {
        totalPrompts: 127,
        avgResponseTime: 1.2,
        successRate: 94,
        lastUpdated: "2 hours ago",
      },
      weeklyData: {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        scores: [78, 82, 85, 79, 88, 85, 91],
        prompts: [12, 18, 15, 22, 19, 14, 16],
      },
      modelPerformance: {
        ChatGPT: { score: 87, prompts: 45 },
        Claude: { score: 82, prompts: 38 },
        Gemini: { score: 79, prompts: 44 },
      },
    },
    {
      id: "2",
      name: "HealthPlus",
      category: "Healthcare",
      region: "Europe",
      scores: { TOFU: 78, MOFU: 81, BOFU: 75, EVFU: 83 },
      sentiment: {
        trend: "down",
        percentage: 8,
        distribution: {
          positive: 40,
          neutral: 40,
          negative: 18,
          stronglyPositive: 2,
        },
      },
      metrics: {
        totalPrompts: 89,
        avgResponseTime: 1.8,
        successRate: 91,
        lastUpdated: "4 hours ago",
      },
      weeklyData: {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        scores: [82, 79, 78, 81, 75, 77, 83],
        prompts: [8, 12, 10, 15, 13, 9, 11],
      },
      modelPerformance: {
        ChatGPT: { score: 81, prompts: 32 },
        Claude: { score: 85, prompts: 28 },
        Gemini: { score: 76, prompts: 29 },
      },
    },
    {
      id: "3",
      name: "EduLearn",
      category: "Education",
      region: "Global",
      scores: { TOFU: 92, MOFU: 88, BOFU: 85, EVFU: 79 },
      sentiment: {
        trend: "up",
        percentage: 15,
        distribution: {
          positive: 55,
          neutral: 30,
          negative: 10,
          stronglyPositive: 5,
        },
      },
      metrics: {
        totalPrompts: 156,
        avgResponseTime: 1.5,
        successRate: 96,
        lastUpdated: "1 hour ago",
      },
      weeklyData: {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        scores: [88, 90, 92, 89, 91, 88, 86],
        prompts: [18, 22, 20, 25, 23, 19, 21],
      },
      modelPerformance: {
        ChatGPT: { score: 89, prompts: 52 },
        Claude: { score: 91, prompts: 48 },
        Gemini: { score: 87, prompts: 56 },
      },
    },
  ];

  const selectedBrand =
    brands.find((brand) => brand.id === selectedBrandId) || brands[0];

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

  const MetricCard: React.FC<{
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    trend?: { value: number; isPositive: boolean };
  }> = ({ title, value, subtitle, icon, trend }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="p-2 bg-primary/10 rounded-lg">{icon}</div>
          <div className="ml-4">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {title}
            </h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {value}
            </p>
            {subtitle && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {trend && (
          <div
            className={`flex items-center ${
              trend.isPositive ? "text-green-600" : "text-red-600"
            }`}
          >
            {trend.isPositive ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span className="ml-1 text-sm font-medium">
              {Math.abs(trend.value)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );

  const FunnelChart: React.FC<{ scores: Brand["scores"] }> = ({ scores }) => {
    const stages = ["TOFU", "MOFU", "BOFU", "EVFU"] as const;

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Funnel Performance
        </h3>
        <div className="space-y-4">
          {stages.map((stage, index) => (
            <div key={stage} className="flex items-center">
              <div className="w-16 text-sm font-medium text-gray-600 dark:text-gray-400">
                {stage}
              </div>
              <div className="flex-1 mx-4">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full ${getScoreColor(
                      scores[stage]
                    )}`}
                    style={{ width: `${scores[stage]}%` }}
                  />
                </div>
              </div>
              <div
                className={`w-12 text-right text-sm font-semibold ${getScoreTextColor(
                  scores[stage]
                )}`}
              >
                {scores[stage]}%
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const SentimentAnalysis: React.FC<{ sentiment: Brand["sentiment"] }> = ({
    sentiment,
  }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Sentiment Analysis
        </h3>
        <div
          className={`flex items-center space-x-1 ${getTrendColor(
            sentiment.trend
          )}`}
        >
          {getTrendIcon(sentiment.trend)}
          <span className="text-sm font-medium">{sentiment.percentage}%</span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
          <div className="flex h-4 rounded-full overflow-hidden">
            <div
              className="bg-green-500"
              style={{ width: `${sentiment.distribution.stronglyPositive}%` }}
            />
            <div
              className="bg-green-400"
              style={{ width: `${sentiment.distribution.positive}%` }}
            />
            <div
              className="bg-gray-400"
              style={{ width: `${sentiment.distribution.neutral}%` }}
            />
            <div
              className="bg-red-400"
              style={{ width: `${sentiment.distribution.negative}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2" />
            <span className="text-gray-600 dark:text-gray-400">
              Strongly Positive: {sentiment.distribution.stronglyPositive}%
            </span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-400 rounded-full mr-2" />
            <span className="text-gray-600 dark:text-gray-400">
              Positive: {sentiment.distribution.positive}%
            </span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-gray-400 rounded-full mr-2" />
            <span className="text-gray-600 dark:text-gray-400">
              Neutral: {sentiment.distribution.neutral}%
            </span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-400 rounded-full mr-2" />
            <span className="text-gray-600 dark:text-gray-400">
              Negative: {sentiment.distribution.negative}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const ModelPerformance: React.FC<{
    performance: Brand["modelPerformance"];
  }> = ({ performance }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
        AI Model Performance
      </h3>
      <div className="space-y-4">
        {Object.entries(performance).map(([model, data]) => (
          <div
            key={model}
            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
          >
            <div className="flex items-center">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mr-3">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {model}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {data.prompts} prompts
                </div>
              </div>
            </div>
            <div
              className={`text-lg font-semibold ${getScoreTextColor(
                data.score
              )}`}
            >
              {data.score}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const WeeklyTrend: React.FC<{ data: Brand["weeklyData"] }> = ({ data }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
        Weekly Performance Trend
      </h3>
      <div className="space-y-4">
        <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
          <span>Score Trend</span>
          <span>Prompt Volume</span>
        </div>
        {data.labels.map((label, index) => (
          <div key={label} className="flex items-center justify-between">
            <div className="w-12 text-sm font-medium text-gray-600 dark:text-gray-400">
              {label}
            </div>
            <div className="flex-1 mx-4 flex items-center">
              <div className="w-1/2 pr-2">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getScoreColor(
                      data.scores[index]
                    )}`}
                    style={{ width: `${data.scores[index]}%` }}
                  />
                </div>
              </div>
              <div className="w-1/2 pl-2">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-blue-500"
                    style={{
                      width: `${
                        (data.prompts[index] / Math.max(...data.prompts)) * 100
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="flex space-x-4 text-sm">
              <span className={getScoreTextColor(data.scores[index])}>
                {data.scores[index]}%
              </span>
              <span className="text-blue-600 dark:text-blue-400">
                {data.prompts[index]}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (brands.length === 0) {
    return (
      <div className="text-center py-12">
        <Building2 className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
          No brands
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Get started by creating your first brand.
        </p>
        <div className="mt-6">
          <Link
            href="/app/brands/create"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Brand
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Brand Selector */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Brand Analytics
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Detailed analysis and performance metrics
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-gray-400" />
            <Select value={selectedBrandId} onValueChange={setSelectedBrandId}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {brands.map((brand) => (
                  <SelectItem key={brand.id} value={brand.id}>
                    <div className="flex items-center">
                      <span className="font-medium">{brand.name}</span>
                      <span className="ml-2 text-xs text-gray-500">
                        ({brand.category})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Link
          href="/app/brands/create"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Brand
        </Link>
      </div>

      {/* Brand Info Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <div className="ml-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {selectedBrand.name}
              </h2>
              <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                <span>{selectedBrand.category}</span>
                <span>•</span>
                <span>{selectedBrand.region}</span>
                <span>•</span>
                <span>Last updated: {selectedBrand.metrics.lastUpdated}</span>
              </div>
            </div>
          </div>
          <div className="flex space-x-2">
            <Link
              href={`/app/brands/${selectedBrand.id}/edit`}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Edit Brand
            </Link>
            <Link
              href={`/app/prompt-logs?brand=${selectedBrand.id}`}
              className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md transition-colors"
            >
              View Logs
            </Link>
          </div>
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

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Prompts"
          value={selectedBrand.metrics.totalPrompts}
          icon={<BarChart3 className="w-5 h-5 text-primary" />}
          trend={{ value: 12, isPositive: true }}
        />
        <MetricCard
          title="Success Rate"
          value={`${selectedBrand.metrics.successRate}%`}
          icon={<Target className="w-5 h-5 text-primary" />}
          trend={{ value: 3, isPositive: true }}
        />
        <MetricCard
          title="Avg Response Time"
          value={`${selectedBrand.metrics.avgResponseTime}s`}
          icon={<Activity className="w-5 h-5 text-primary" />}
          trend={{ value: 8, isPositive: false }}
        />
        <MetricCard
          title="Overall Score"
          value={`${Math.round(
            (selectedBrand.scores.TOFU +
              selectedBrand.scores.MOFU +
              selectedBrand.scores.BOFU +
              selectedBrand.scores.EVFU) /
              4
          )}%`}
          icon={<TrendingUp className="w-5 h-5 text-primary" />}
          trend={{
            value: selectedBrand.sentiment.percentage,
            isPositive: selectedBrand.sentiment.trend === "up",
          }}
        />
      </div>

      {/* Main Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FunnelChart scores={selectedBrand.scores} />
        <SentimentAnalysis sentiment={selectedBrand.sentiment} />
        <ModelPerformance performance={selectedBrand.modelPerformance} />
        <WeeklyTrend data={selectedBrand.weeklyData} />
      </div>
    </div>
  );
};

export default DashboardPage;
