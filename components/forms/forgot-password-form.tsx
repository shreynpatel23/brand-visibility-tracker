"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import Loading from "../loading";
import { postData } from "@/utils/fetch";
import ApiError from "../api-error";

const formSchema = z.object({
  email: z.string().min(2, {
    message: "Please enter a valid email address",
  }),
});

export function ForgotPasswordForm({
  onSuccess,
}: {
  onSuccess: (email: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);

    try {
      const { email } = values;
      await postData("/api/forgot-password", {
        email,
      });
      onSuccess(values.email);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form className="mt-8 space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-4">
          {/* EMAIL INPUT  */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email address</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="jhon.doe@gmail.com"
                    autoComplete="email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        {error && (
          <ApiError message={error} setMessage={(value) => setError(value)} />
        )}

        <div>
          <Button
            type="submit"
            variant={loading ? "outline" : "default"}
            disabled={loading}
            className="w-full"
          >
            {loading ? <Loading message="Sending..." /> : "Send reset link"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
