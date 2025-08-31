"use client";

import React, { useState } from "react";
import {
  Filter,
  Search,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface LogEntry {
  id: string;
  timestamp: string;
  model: string;
  stage: "TOFU" | "MOFU" | "BOFU" | "EVFU";
  prompt: string;
  response: string;
  score: number;
  responseTime: number;
  status: "success" | "error" | "warning";
  userId: string;
}

export default function ViewLogs({
  userId,
  brandId,
}: {
  userId: string;
  brandId: string;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedModel, setSelectedModel] = useState("all");
  const [selectedStage, setSelectedStage] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [dateRange, setDateRange] = useState("7days");

  // Mock log data
  const logs: LogEntry[] = [
    {
      id: "1",
      timestamp: "2024-01-15T10:30:00Z",
      model: "ChatGPT",
      stage: "TOFU",
      prompt: "What are the benefits of using TechCorp's cloud solutions?",
      response:
        "TechCorp offers scalable, secure, and cost-effective cloud solutions...",
      score: 87,
      responseTime: 1.2,
      status: "success",
      userId: "user123",
    },
    {
      id: "2",
      timestamp: "2024-01-15T10:25:00Z",
      model: "Claude",
      stage: "MOFU",
      prompt: "How does TechCorp compare to competitors in pricing?",
      response:
        "TechCorp provides competitive pricing with transparent cost structure...",
      score: 82,
      responseTime: 1.4,
      status: "success",
      userId: "user456",
    },
    {
      id: "3",
      timestamp: "2024-01-15T10:20:00Z",
      model: "Gemini",
      stage: "BOFU",
      prompt: "What is TechCorp's refund policy?",
      response: "Error: Unable to retrieve refund policy information",
      score: 0,
      responseTime: 2.1,
      status: "error",
      userId: "user789",
    },
    {
      id: "4",
      timestamp: "2024-01-15T10:15:00Z",
      model: "ChatGPT",
      stage: "EVFU",
      prompt: "How can I upgrade my TechCorp subscription?",
      response:
        "You can upgrade your subscription through the customer portal...",
      score: 91,
      responseTime: 1.1,
      status: "success",
      userId: "user123",
    },
    {
      id: "5",
      timestamp: "2024-01-15T10:10:00Z",
      model: "Claude",
      stage: "TOFU",
      prompt: "What industries does TechCorp serve?",
      response:
        "TechCorp serves various industries including healthcare, finance...",
      score: 75,
      responseTime: 1.8,
      status: "warning",
      userId: "user456",
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "error":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "warning":
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20";
      case "error":
        return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20";
      case "warning":
        return "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20";
      default:
        return "text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    if (score >= 40) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  };

  const filteredLogs = logs.filter((log) => {
    if (
      searchTerm &&
      !log.prompt.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }
    if (selectedModel !== "all" && log.model.toLowerCase() !== selectedModel) {
      return false;
    }
    if (selectedStage !== "all" && log.stage !== selectedStage) {
      return false;
    }
    if (selectedStatus !== "all" && log.status !== selectedStatus) {
      return false;
    }
    return true;
  });

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Activity Logs
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Monitor all AI interactions and responses for Brand {brandId}
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export Logs
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Search Prompts
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search prompts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-sm border border-input rounded-md bg-background text-foreground"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Model
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background text-foreground"
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
              className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background text-foreground"
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
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background text-foreground"
            >
              <option value="all">All Status</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Period
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background text-foreground"
            >
              <option value="7days">Last 7 days</option>
              <option value="30days">Last 30 days</option>
              <option value="90days">Last 90 days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Activity
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {filteredLogs.length} entries found
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Timestamp
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Model
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Stage
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Prompt
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Score
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Response Time
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, index) => (
                  <tr
                    key={log.id}
                    className={`border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                      index % 2 === 0 ? "bg-gray-50/50 dark:bg-gray-800/50" : ""
                    }`}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <Clock className="w-4 h-4 mr-2" />
                        {formatTimestamp(log.timestamp)}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {log.model}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                        {log.stage}
                      </span>
                    </td>
                    <td className="py-4 px-4 max-w-xs">
                      <p className="text-sm text-gray-900 dark:text-white truncate">
                        {log.prompt}
                      </p>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span
                        className={`font-semibold ${getScoreColor(log.score)}`}
                      >
                        {log.score}%
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-gray-900 dark:text-white">
                        {log.responseTime}s
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            log.status
                          )}`}
                        >
                          {getStatusIcon(log.status)}
                          <span className="ml-1 capitalize">{log.status}</span>
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredLogs.length === 0 && (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                No logs found
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Try adjusting your filters to see more results.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
