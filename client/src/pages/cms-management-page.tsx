import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, Edit, Eye, Image } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const cmsContentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  imageUrl: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

type CmsContentValues = z.infer<typeof cmsContentSchema>;

const cmsSections = [
  { key: "home_hero_title", label: "Homepage Hero Title", description: "Main headline text shown on the public homepage hero section" },
  { key: "home_hero_subtitle", label: "Homepage Hero Subtitle", description: "Supporting text shown below the homepage hero title" },
  { key: "about_ipcr", label: "About IPCR", description: "Information about the Institute for Peace and Conflict Resolution" },
  { key: "about_director", label: "About the Director General", description: "Information about the Director General" },
  { key: "peace_initiatives", label: "Peace Initiatives", description: "Peace initiatives and programs" },
];

export default function CmsManagementPage() {
  const queryClient = useQueryClient();
  const [editingSection, setEditingSection] = useState<string | null>(null);

  const { data: cmsContents = [], isLoading } = useQuery({
    queryKey: ["/api/cms/content"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/cms/content");
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ section, data }: { section: string; data: CmsContentValues }) => {
      const res = await apiRequest("PUT", `/api/cms/content/${section}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cms/content"] });
      toast({
        title: "Content Updated",
        description: "The content has been successfully updated.",
      });
      setEditingSection(null);
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update content. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (section: string) => {
    setEditingSection(section);
  };

  const handleCancel = () => {
    setEditingSection(null);
  };

  const onSubmit = (data: CmsContentValues, section: string) => {
    updateMutation.mutate({ section, data });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">CMS Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage landing page content for About IPCR, Director General, and Peace Initiatives sections
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          Admin Only
        </Badge>
      </div>

      <div className="grid gap-8">
        {cmsSections.map((section) => {
          const content = cmsContents.find((c: any) => c.section === section.key);
          const isEditing = editingSection === section.key;

          return (
            <Card key={section.key} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {section.label}
                      {content?.isActive ? (
                        <Badge variant="default" className="text-xs">Active</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Inactive</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {!isEditing && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(section.key)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {!isEditing && content ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">{content.title}</h3>
                      <div className="prose max-w-none">
                        <p className="whitespace-pre-wrap">{content.content}</p>
                      </div>
                    </div>
                    {content.imageUrl && (
                      <div className="mt-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                          <Image className="h-4 w-4" />
                          Featured Image
                        </div>
                        <img
                          src={content.imageUrl}
                          alt={content.title}
                          className="max-w-md rounded-lg border"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t">
                      <span>Last updated: {content.lastUpdatedAt ? new Date(content.lastUpdatedAt).toLocaleString() : 'Never'}</span>
                      <span>Updated by: {content.lastUpdatedBy || 'System'}</span>
                    </div>
                  </div>
                ) : !isEditing && !content ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No content available for this section.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => handleEdit(section.key)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Create Content
                    </Button>
                  </div>
                ) : (
                  <CmsContentForm
                    section={section.key}
                    initialData={content}
                    onSubmit={(data) => onSubmit(data, section.key)}
                    onCancel={handleCancel}
                    isSubmitting={updateMutation.isPending}
                  />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function CmsContentForm({
  section,
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  section: string;
  initialData?: any;
  onSubmit: (data: CmsContentValues) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const form = useForm<CmsContentValues>({
    resolver: zodResolver(cmsContentSchema),
    defaultValues: {
      title: initialData?.title || "",
      content: initialData?.content || "",
      imageUrl: initialData?.imageUrl || "",
      isActive: initialData?.isActive ?? true,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter section title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Content</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter section content"
                  className="min-h-[200px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                This content will be displayed on the landing page. You can use plain text or basic HTML.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Image URL (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com/image.jpg" {...field} />
              </FormControl>
              <FormDescription>
                URL to an image that will be displayed with this section.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Active</FormLabel>
                <FormDescription>
                  Whether this content is visible on the landing page
                </FormDescription>
              </div>
              <FormControl>
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={field.onChange}
                  className="h-4 w-4"
                />
              </FormControl>
            </FormItem>
          )}
        />

        <Separator />

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
