import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FaTwitter, FaFacebook, FaInstagram, FaWhatsapp } from "react-icons/fa";
import { RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { crisisTypes } from "@/lib/crisis-constants";

interface SocialMediaPost {
  platform: string;
  author: string;
  content: string;
  timestamp: string;
  location: string;
  url?: string;
  crisisType?: string;
  confidence?: number;
  /** Words from the watch list that appeared in this post (content filtering). */
  flaggedWords?: string[];
}

export function SocialMediaMonitor() {
  const [activePlatform, setActivePlatform] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const fetchFromWebMutation = useMutation({
    mutationFn: async (save: boolean) => {
      const res = await fetch("/api/social/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ save }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to fetch from web");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/posts"] });
      toast({
        title: "Fetched from web",
        description: `Retrieved ${data?.length ?? 0} posts from X, Facebook, and TikTok.`,
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Fetch failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const crisisIngestMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/crisis-ingest/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to run crisis ingest");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/posts"] });
      toast({
        title: "Crisis ingest completed",
        description: data?.message || "Social + news data ingested. Incidents may have been created.",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Crisis ingest failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const createAlertMutation = useMutation({
    mutationFn: async (post: SocialMediaPost) => {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: `Social: ${post.content.slice(0, 80)}${post.content.length > 80 ? "..." : ""}`,
          description: post.content,
          severity: (post.confidence ?? 0.7) >= 0.9 ? "high" : (post.confidence ?? 0.7) >= 0.7 ? "medium" : "low",
          status: "active",
          source: "social_media",
          region: "Nigeria",
          location: post.location || "Nigeria",
          escalationLevel: 3,
        }),
      });
      if (!res.ok) throw new Error("Failed to create alert");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
    },
  });

  const { data: posts = [], isLoading } = useQuery<SocialMediaPost[]>({
    queryKey: ["/api/social/posts", { platform: activePlatform }],
    queryFn: async () => {
      const url = activePlatform
        ? `/api/social/posts?platform=${activePlatform}`
        : "/api/social/posts";
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) return [];
      return response.json();
    },
    retry: false,
  });

  const handlePlatformChange = (value: string) => {
    setActivePlatform(value === "all" ? null : value);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString));
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "twitter":
        return <FaTwitter className="text-blue-400" />;
      case "facebook":
        return <FaFacebook className="text-blue-600" />;
      case "instagram":
        return <FaInstagram className="text-pink-500" />;
      case "whatsapp":
        return <FaWhatsapp className="text-green-500" />;
      case "tiktok":
        return <span className="text-sm font-bold text-black">TT</span>;
      default:
        return null;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return "bg-green-100 text-green-800";
    if (confidence >= 0.7) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  function renderPosts() {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          <span className="ml-2">Loading posts...</span>
        </div>
      );
    }

    if (posts.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <p>No social media posts found</p>
          <p className="text-sm mt-2">Click &quot;Fetch from web&quot; to load current posts from X, Facebook, and TikTok. Configure integrations for live data.</p>
          <div className="flex gap-2 justify-center mt-4 flex-wrap">
            <Button variant="outline" onClick={() => fetchFromWebMutation.mutate(false)} disabled={fetchFromWebMutation.isPending}>
              {fetchFromWebMutation.isPending ? "Fetching…" : "Fetch from web"}
            </Button>
            <Button variant="outline" onClick={() => window.location.href = "/integrations"}>
              Configure Integrations
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {posts.map((post, index) => (
          <Card key={index} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start">
                <div className="mr-3 mt-1">{getPlatformIcon(post.platform)}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="font-semibold">{post.author}</span>
                      <span className="mx-2 text-gray-500">•</span>
                      <span className="text-sm text-muted-foreground">{formatDate(post.timestamp)}</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {post.confidence !== undefined && (
                        <Badge variant="outline" className={getConfidenceColor(post.confidence)}>
                          {Math.round(post.confidence * 100)}% confidence
                        </Badge>
                      )}
                      {post.crisisType && crisisTypes[post.crisisType] && (
                        <Badge style={{ backgroundColor: crisisTypes[post.crisisType].color, color: "#fff" }}>
                          {crisisTypes[post.crisisType].label}
                        </Badge>
                      )}
                      {post.flaggedWords && post.flaggedWords.length > 0 && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
                          Watch words: {post.flaggedWords.join(", ")}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="mt-2">{post.content}</p>
                  {post.location && (
                    <div className="mt-2 text-sm text-muted-foreground">📍 {post.location}</div>
                  )}
                  <div className="mt-3 flex justify-end space-x-2">
                    <Button variant="outline" size="sm">Dismiss</Button>
                    <Button variant="outline" size="sm">View Source</Button>
                    <Button
                      size="sm"
                      onClick={() => createAlertMutation.mutate(post)}
                      disabled={createAlertMutation.isPending}
                    >
                      {createAlertMutation.isPending ? "Creating..." : "Create Alert"}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Social Media Crisis Monitoring</CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchFromWebMutation.mutate(false)}
            disabled={fetchFromWebMutation.isPending}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${fetchFromWebMutation.isPending ? "animate-spin" : ""}`} />
            {fetchFromWebMutation.isPending ? "Fetching…" : "Fetch from web"}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => crisisIngestMutation.mutate()}
            disabled={crisisIngestMutation.isPending}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${crisisIngestMutation.isPending ? "animate-spin" : ""}`} />
            {crisisIngestMutation.isPending ? "Running…" : "Run Live Crisis Ingest"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" onValueChange={handlePlatformChange} className="w-full">
          <TabsList className="grid grid-cols-6 mb-6">
            <TabsTrigger value="all">All Platforms</TabsTrigger>
            <TabsTrigger value="twitter" className="flex items-center gap-2">
              <FaTwitter /> X
            </TabsTrigger>
            <TabsTrigger value="facebook" className="flex items-center gap-2">
              <FaFacebook /> Facebook
            </TabsTrigger>
            <TabsTrigger value="instagram" className="flex items-center gap-2">
              <FaInstagram /> Instagram
            </TabsTrigger>
            <TabsTrigger value="tiktok" className="flex items-center gap-2">
              <span className="font-bold text-xs">TT</span> TikTok
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="flex items-center gap-2">
              <FaWhatsapp /> WhatsApp
            </TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-0">{renderPosts()}</TabsContent>
          <TabsContent value="twitter" className="mt-0">{renderPosts()}</TabsContent>
          <TabsContent value="facebook" className="mt-0">{renderPosts()}</TabsContent>
          <TabsContent value="instagram" className="mt-0">{renderPosts()}</TabsContent>
          <TabsContent value="tiktok" className="mt-0">{renderPosts()}</TabsContent>
          <TabsContent value="whatsapp" className="mt-0">{renderPosts()}</TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
