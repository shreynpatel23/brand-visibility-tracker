"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TagInput } from "../tag-input";
import { deleteData, fetchData, putData } from "@/utils/fetch";
import ApiError from "../api-error";
import Loading from "../loading";
import { CATEGORIES, REGIONS } from "@/constants/onboarding-constants";
import { toast } from "sonner";
import { AlertCircle, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";

export interface IEditBrandForm {
  _id: string;
  name: string;
  category?: string;
  region?: string;
  target_audience?: string[];
  competitors?: string[];
  use_case?: string;
  feature_list?: string[];
}

const formSchema = z.object({
  name: z.string().min(1, "Brand name is required"),
  category: z.string().optional(),
  region: z.string().optional(),
  target_audience: z.array(z.string()).optional(),
  competitors: z.array(z.string()).optional(),
  use_case: z.string().optional(),
  feature_list: z.array(z.string()).optional(),
});

export function EditBrandForm({
  userId,
  brandId,
}: {
  userId: string;
  brandId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [brandName, setBrandName] = useState("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      category: "",
      region: "",
      target_audience: [],
      competitors: [],
      use_case: "",
      feature_list: [],
    },
  });

  // Fetch brand data on component mount
  useEffect(() => {
    async function fetchBrandData() {
      try {
        const response = await fetchData(`/api/brand/${brandId}`);
        const brandData = response.data;

        form.reset({
          name: brandData.name || "",
          category: brandData.category || "",
          region: brandData.region || "",
          target_audience: brandData.target_audience || [],
          competitors: brandData.competitors || [],
          use_case: brandData.use_case || "",
          feature_list: brandData.feature_list || [],
        });
      } catch (error) {
        setError(
          `Error fetching brand data - ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      } finally {
        setLoading(false);
      }
    }

    if (brandId) {
      fetchBrandData();
    }
  }, [brandId, form]);

  async function handleUpdateBrand(data: z.infer<typeof formSchema>) {
    setSaving(true);
    setError("");

    try {
      const updatePayload = {
        user_id: userId,
        name: data.name,
        category: data.category,
        region: data.region,
        competitors: data.competitors,
        use_case: data.use_case,
        target_audience: data.target_audience,
        feature_list: data.feature_list,
      };

      await putData(`/api/brand/${brandId}`, updatePayload);
      toast.success("Brand updated successfully!");
    } catch (error) {
      setError(
        `Error updating brand - ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setSaving(false);
    }
  }

  const handleDeleteBrand = async () => {
    if (!brandId || !brandName) return;

    setDeleting(true);
    try {
      await deleteData(`/api/brand/${brandId}`, {
        user_id: userId,
      });
      toast.success("Brand deleted successfully!");
      setDeleteDialogOpen(false);
      setBrandName("");
      router.push(`/${userId}/brands`);
    } catch (error) {
      toast.error(
        `Error deleting brand - ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setDeleting(false);
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
    <div className="max-w-2xl mx-auto py-8">
      <Form {...form}>
        <form className="space-y-8">
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Brand Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter brand name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl className="w-full">
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Region</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl className="w-full">
                        <SelectTrigger>
                          <SelectValue placeholder="Select region" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {REGIONS.map((reg) => (
                          <SelectItem key={reg} value={reg}>
                            {reg}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Controller
              control={form.control}
              name="target_audience"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Audience</FormLabel>
                  <TagInput
                    value={field.value || []}
                    onChange={field.onChange}
                    placeholder="Press Enter to add target audience"
                  />
                </FormItem>
              )}
            />

            <Controller
              control={form.control}
              name="competitors"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Main Competitors</FormLabel>
                  <TagInput
                    value={field.value || []}
                    onChange={field.onChange}
                    placeholder="Press Enter to add competitors"
                  />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="use_case"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Use Case</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your brand's use case"
                      {...field}
                      rows={4}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <Controller
              control={form.control}
              name="feature_list"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Key Features</FormLabel>
                  <TagInput
                    value={field.value || []}
                    onChange={field.onChange}
                    placeholder="Press Enter to add key features"
                  />
                </FormItem>
              )}
            />
          </div>

          {error && (
            <ApiError message={error} setMessage={(value) => setError(value)} />
          )}

          {/* Navigation */}
          <div className="flex justify-center">
            <Button
              type="button"
              className="w-[200px]"
              onClick={() => {
                handleUpdateBrand(form.getValues());
              }}
              variant={saving ? "outline" : "default"}
              disabled={!form.watch("name") || saving}
            >
              {saving ? (
                <Loading message="Updating brand..." />
              ) : (
                "Update Brand"
              )}
            </Button>
          </div>

          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mt-8">
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
              type="button"
              variant="outline"
              className="text-red-600 border-red-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
              onClick={() => {
                setBrandName(form.getValues().name);
                setDeleteDialogOpen(true);
              }}
              disabled={deleting}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Brand
            </Button>
          </div>
        </form>
      </Form>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Brand</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{brandName}"? This action cannot
              be undone and will permanently remove all associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteBrand}
              disabled={deleting}
            >
              {deleting ? (
                <Loading message="Deleting brand..." />
              ) : (
                "Delete Brand"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
