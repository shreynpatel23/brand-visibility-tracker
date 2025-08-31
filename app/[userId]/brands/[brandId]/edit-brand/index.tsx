"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  Save,
  AlertCircle,
  Globe,
  Tag,
  MapPin,
  Palette,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Loading from "@/components/loading";
import ApiError from "@/components/api-error";
import { fetchData } from "@/utils/fetch";

interface BrandData {
  id: string;
  name: string;
  description: string;
  category: string;
  region: string;
  website?: string;
  keywords: string[];
  color?: string;
  logo?: string;
}

export default function EditBrand({
  userId,
  brandId,
}: {
  userId: string;
  brandId: string;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [brandData, setBrandData] = useState<BrandData>({
    id: brandId,
    name: "",
    description: "",
    category: "",
    region: "",
    website: "",
    keywords: [],
    color: "#3B82F6",
  });
  const [newKeyword, setNewKeyword] = useState("");

  useEffect(() => {
    async function fetchBrand() {
      try {
        const response = await fetchData(`/api/brand/${brandId}`);
        const { data } = response;
        setBrandData({
          id: brandId,
          name: data.name || "",
          description: data.description || "",
          category: data.category || "",
          region: data.region || "",
          website: data.website || "",
          keywords: data.keywords || [],
          color: data.color || "#3B82F6",
        });
      } catch (error) {
        setError(
          `Error fetching brand - ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      } finally {
        setLoading(false);
      }
    }

    if (brandId && userId) {
      fetchBrand();
    }
  }, [userId, brandId]);

  const handleInputChange = (field: keyof BrandData, value: string) => {
    setBrandData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const addKeyword = () => {
    if (newKeyword.trim() && !brandData.keywords.includes(newKeyword.trim())) {
      setBrandData((prev) => ({
        ...prev,
        keywords: [...prev.keywords, newKeyword.trim()],
      }));
      setNewKeyword("");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      // Mock API call - replace with actual API endpoint
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSuccess("Brand updated successfully!");
    } catch (error) {
      setError(
        `Error updating brand - ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setSaving(false);
    }
  };

  const handleKeywordKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addKeyword();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loading message="Loading brand details..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Edit Brand
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Update your brand information and settings
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <ApiError message={error} setMessage={(value) => setError(value)} />
      )}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-green-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-800 dark:text-green-200">
                {success}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Brand Information Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Brand Information
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Basic information about your brand
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Brand Name *
              </label>
              <input
                type="text"
                value={brandData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter brand name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category *
              </label>
              <select
                value={brandData.category}
                onChange={(e) => handleInputChange("category", e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select category</option>
                <option value="Technology">Technology</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Finance">Finance</option>
                <option value="Education">Education</option>
                <option value="Retail">Retail</option>
                <option value="Manufacturing">Manufacturing</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                Region *
              </label>
              <select
                value={brandData.region}
                onChange={(e) => handleInputChange("region", e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select region</option>
                <option value="North America">North America</option>
                <option value="Europe">Europe</option>
                <option value="Asia Pacific">Asia Pacific</option>
                <option value="Latin America">Latin America</option>
                <option value="Middle East & Africa">
                  Middle East & Africa
                </option>
                <option value="Global">Global</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Globe className="w-4 h-4 inline mr-1" />
                Website
              </label>
              <input
                type="url"
                value={brandData.website}
                onChange={(e) => handleInputChange("website", e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="https://example.com"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={brandData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                rows={4}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Describe your brand..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-300">
                Danger Zone
              </h3>
              <p className="text-sm text-red-700 dark:text-red-400">
                Irreversible and destructive actions
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="text-red-600 border-red-300 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Brand
          </Button>
        </div>
      </div>
    </div>
  );
}
