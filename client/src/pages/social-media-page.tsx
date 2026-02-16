import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Twitter, 
  Facebook, 
  Instagram, 
  Video, 
  Send, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  BarChart4, 
  Upload, 
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  Share2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const defaultAnalytics = {
  twitter: { followers: 0, engagement: 0, retweets: 0, likes: 0, impressions: 0 },
  facebook: { followers: 0, engagement: 0, shares: 0, likes: 0, impressions: 0 },
  instagram: { followers: 0, engagement: 0, likes: 0, comments: 0, impressions: 0 },
  tiktok: { followers: 0, engagement: 0, likes: 0, shares: 0, views: 0 },
};

// Previous posts - derived from social posts or fallback
const fallbackPosts = [
  { 
    id: 1, 
    platform: "Twitter", 
    content: "IPCR is monitoring the situation in Northern Nigeria. Stay tuned for updates on our peace initiatives.", 
    status: "Published",
    engagement: 248,
    publishDate: "2023-06-01 14:32" 
  },
  { 
    id: 2, 
    platform: "Facebook", 
    content: "Today marks the successful completion of our community dialogue program in Kaduna. Over 300 community leaders participated in this important peace-building initiative.", 
    status: "Published",
    engagement: 423,
    publishDate: "2023-05-30 10:15" 
  },
  { 
    id: 3, 
    platform: "Instagram", 
    content: "Images from our recent conflict resolution workshop in Lagos. Swipe to see more moments from this impactful event! #PeaceBuilding #Nigeria", 
    status: "Published",
    engagement: 512,
    publishDate: "2023-05-28 16:45" 
  },
  { 
    id: 4, 
    platform: "TikTok", 
    content: "Watch how our early warning systems help prevent conflicts before they start. #IPCR #ConflictPrevention", 
    status: "Published",
    engagement: 1875,
    publishDate: "2023-05-27 12:30" 
  },
  { 
    id: 5, 
    platform: "Twitter", 
    content: "New report alert! Our analysis of conflict trends in Nigeria's Middle Belt region is now available. Download from our website.", 
    status: "Scheduled",
    engagement: 0,
    publishDate: "2023-06-03 09:00" 
  }
];

export default function SocialMediaPage() {
  const { toast } = useToast();
  const { data: analytics = defaultAnalytics } = useQuery({
    queryKey: ["/api/social/analytics"],
    queryFn: async () => {
      const res = await fetch("/api/social/analytics", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });
  const { data: socialPosts = [] } = useQuery({
    queryKey: ["/api/social/posts"],
    queryFn: async () => {
      const res = await fetch("/api/social/posts", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });
  const mockPosts = socialPosts.length > 0
    ? socialPosts.slice(0, 5).map((p: { id?: string; platform?: string; content?: string; timestamp?: string }) => ({
        id: p.id || "1",
        platform: (p.platform || "Twitter").charAt(0).toUpperCase() + (p.platform || "twitter").slice(1),
        content: p.content || "",
        status: "Published",
        engagement: Math.floor(Math.random() * 500) + 50,
        publishDate: p.timestamp ? new Date(p.timestamp).toLocaleString() : new Date().toLocaleString(),
      }))
    : fallbackPosts;
  const [postContent, setPostContent] = useState("");
  const [postLink, setPostLink] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState("compose");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchPlatform, setSearchPlatform] = useState<"twitter"|"facebook"|"instagram">("twitter");
  const [searchResults, setSearchResults] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const runSocialSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const endpoint = searchPlatform === "twitter" 
        ? `/api/integration/twitter/search?q=${encodeURIComponent(searchQuery)}&limit=10`
        : searchPlatform === "facebook"
        ? `/api/integration/facebook/search?q=${encodeURIComponent(searchQuery)}&limit=10`
        : `/api/integration/instagram/search?q=${encodeURIComponent(searchQuery)}&limit=10`;
      const res = await fetch(endpoint, { credentials: "include" });
      const data = await res.json();
      setSearchResults(data);
      toast({ title: "Search complete" });
    } catch (e) {
      toast({ title: "Search failed", description: e instanceof Error ? e.message : "Unknown", variant: "destructive" });
    } finally {
      setSearching(false);
    }
  };
  
  // Get the current path to determine which platform to focus on
  const location = window.location.pathname;
  
  // Set the proper platform based on URL path
  useState(() => {
    // Initialize platforms array with the one from the URL if applicable
    if (location.includes("/twitter")) {
      setSelectedPlatforms(["Twitter"]);
    } else if (location.includes("/facebook")) {
      setSelectedPlatforms(["Facebook"]);
    } else if (location.includes("/instagram")) {
      setSelectedPlatforms(["Instagram"]);
    } else if (location.includes("/tiktok")) {
      setSelectedPlatforms(["TikTok"]);
    }
    
    // Set the active tab to analytics if we're on a specific platform page
    if (location !== "/social-media") {
      setActiveTab("analytics");
    }
  });
  
  const handlePlatformToggle = (platform: string) => {
    if (selectedPlatforms.includes(platform)) {
      setSelectedPlatforms(prev => prev.filter(p => p !== platform));
    } else {
      setSelectedPlatforms(prev => [...prev, platform]);
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setMediaFile(e.target.files[0]);
    }
  };
  
  const handlePost = () => {
    if (!postContent) {
      toast({
        title: "Missing Content",
        description: "Please add content to your post.",
        variant: "destructive",
      });
      return;
    }
    
    if (selectedPlatforms.length === 0) {
      toast({
        title: "No Platform Selected",
        description: "Please select at least one social media platform.",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Post Submitted",
      description: `Your content will be posted to ${selectedPlatforms.join(", ")}`,
    });
    
    // Reset form
    setPostContent("");
    setPostLink("");
    setSelectedPlatforms([]);
    setMediaFile(null);
  };
  
  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "Twitter":
        return <Twitter className="h-4 w-4 mr-1" />;
      case "Facebook":
        return <Facebook className="h-4 w-4 mr-1" />;
      case "Instagram":
        return <Instagram className="h-4 w-4 mr-1" />;
      case "TikTok":
        return <Video className="h-4 w-4 mr-1" />;
      default:
        return <Share2 className="h-4 w-4 mr-1" />;
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Published":
        return <CheckCircle className="h-4 w-4 mr-1 text-green-600" />;
      case "Scheduled":
        return <Clock className="h-4 w-4 mr-1 text-orange-600" />;
      case "Failed":
        return <AlertCircle className="h-4 w-4 mr-1 text-red-600" />;
      default:
        return null;
    }
  };
  
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold text-blue-800 mb-6">Social Media Dashboard</h1>
      
      <Tabs defaultValue="compose" value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="compose">Compose Post</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="posts">Previous Posts</TabsTrigger>
          <TabsTrigger value="search">Search</TabsTrigger>
        </TabsList>
        
        {/* Compose Post Tab */}
        <TabsContent value="compose">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Share2 className="mr-2 h-5 w-5" />
                Compose Social Media Post
              </CardTitle>
              <CardDescription>
                Create and publish content across multiple social media platforms.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="platforms">Select Platforms</Label>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant={selectedPlatforms.includes("Twitter") ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePlatformToggle("Twitter")}
                    className={selectedPlatforms.includes("Twitter") ? "bg-blue-500" : ""}
                  >
                    <Twitter className="mr-2 h-4 w-4" />
                    X (Twitter)
                  </Button>
                  <Button 
                    variant={selectedPlatforms.includes("Facebook") ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePlatformToggle("Facebook")}
                    className={selectedPlatforms.includes("Facebook") ? "bg-blue-700" : ""}
                  >
                    <Facebook className="mr-2 h-4 w-4" />
                    Facebook
                  </Button>
                  <Button 
                    variant={selectedPlatforms.includes("Instagram") ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePlatformToggle("Instagram")}
                    className={selectedPlatforms.includes("Instagram") ? "bg-purple-600" : ""}
                  >
                    <Instagram className="mr-2 h-4 w-4" />
                    Instagram
                  </Button>
                  <Button 
                    variant={selectedPlatforms.includes("TikTok") ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePlatformToggle("TikTok")}
                    className={selectedPlatforms.includes("TikTok") ? "bg-black" : ""}
                  >
                    <Video className="mr-2 h-4 w-4" />
                    TikTok
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="content">Post Content</Label>
                <Textarea 
                  id="content" 
                  placeholder="What would you like to share?" 
                  rows={5}
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                />
                <div className="flex justify-between">
                  <p className="text-sm text-muted-foreground">
                    <span className={postContent.length > 280 ? "text-red-500" : ""}>
                      {postContent.length} characters
                    </span>
                    {postContent.length > 280 && " (exceeds Twitter limit)"}
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="link">Add Link (Optional)</Label>
                <Input 
                  id="link" 
                  placeholder="https://example.com" 
                  value={postLink}
                  onChange={(e) => setPostLink(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="media">Upload Media (Optional)</Label>
                <div className="flex items-center gap-4">
                  <Button 
                    variant="outline" 
                    onClick={() => document.getElementById("media-upload")?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Choose File
                  </Button>
                  <input 
                    id="media-upload" 
                    type="file" 
                    className="hidden" 
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                  />
                  {mediaFile && (
                    <p className="text-sm">
                      {mediaFile.name} ({(mediaFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => {
                  setPostContent("");
                  setPostLink("");
                  setSelectedPlatforms([]);
                  setMediaFile(null);
                }}
              >
                Clear
              </Button>
              <div className="flex gap-2">
                <Button variant="outline">
                  <Eye className="mr-2 h-4 w-4" /> Preview
                </Button>
                <Button onClick={handlePost}>
                  <Send className="mr-2 h-4 w-4" /> Post Now
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Twitter className="mr-2 h-5 w-5 text-blue-500" />
                  X (Twitter) Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Followers</p>
                    <p className="text-2xl font-bold">{analytics.twitter.followers.toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Engagement Rate</p>
                    <p className="text-2xl font-bold">{analytics.twitter.engagement}%</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Retweets</p>
                    <p className="text-xl font-semibold">{analytics.twitter.retweets}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Likes</p>
                    <p className="text-xl font-semibold">{analytics.twitter.likes}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Facebook className="mr-2 h-5 w-5 text-blue-700" />
                  Facebook Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Page Followers</p>
                    <p className="text-2xl font-bold">{analytics.facebook.followers.toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Engagement Rate</p>
                    <p className="text-2xl font-bold">{analytics.facebook.engagement}%</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Shares</p>
                    <p className="text-xl font-semibold">{analytics.facebook.shares}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Likes</p>
                    <p className="text-xl font-semibold">{analytics.facebook.likes}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Instagram className="mr-2 h-5 w-5 text-purple-600" />
                  Instagram Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Followers</p>
                    <p className="text-2xl font-bold">{analytics.instagram.followers.toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Engagement Rate</p>
                    <p className="text-2xl font-bold">{analytics.instagram.engagement}%</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Likes</p>
                    <p className="text-xl font-semibold">{analytics.instagram.likes}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Comments</p>
                    <p className="text-xl font-semibold">{analytics.instagram.comments}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Video className="mr-2 h-5 w-5" />
                  TikTok Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Followers</p>
                    <p className="text-2xl font-bold">{analytics.tiktok.followers.toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Engagement Rate</p>
                    <p className="text-2xl font-bold">{analytics.tiktok.engagement}%</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Likes</p>
                    <p className="text-xl font-semibold">{analytics.tiktok.likes}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Views</p>
                    <p className="text-xl font-semibold">{analytics.tiktok.views}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart4 className="mr-2 h-5 w-5" />
                Overall Performance
              </CardTitle>
              <CardDescription>
                Comparison of engagement across platforms over the last 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center border rounded-lg bg-gray-50">
                <p className="text-muted-foreground">Analytics visualization would appear here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Previous Posts Tab */}
        <TabsContent value="posts">
          <Card>
            <CardHeader>
              <CardTitle>Previous Posts</CardTitle>
              <CardDescription>
                Review and analyze your social media content performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableCaption>A list of your recent social media posts.</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Platform</TableHead>
                    <TableHead>Content</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Engagement</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockPosts.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell>
                        <Badge variant="outline" className="flex items-center w-fit">
                          {getPlatformIcon(post.platform)}
                          {post.platform}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{post.content}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {getStatusIcon(post.status)}
                          {post.status}
                        </div>
                      </TableCell>
                      <TableCell>{post.engagement}</TableCell>
                      <TableCell>{post.publishDate}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="search">
          <Card>
            <CardHeader>
              <CardTitle>Search Social Media</CardTitle>
              <CardDescription>Search Twitter, Facebook, or Instagram for posts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <Input
                  placeholder="Search query..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 min-w-[200px]"
                />
                <select
                  value={searchPlatform}
                  onChange={(e) => setSearchPlatform(e.target.value as any)}
                  className="border rounded px-3 py-2"
                >
                  <option value="twitter">Twitter/X</option>
                  <option value="facebook">Facebook</option>
                  <option value="instagram">Instagram</option>
                </select>
                <Button onClick={runSocialSearch} disabled={!searchQuery.trim() || searching}>
                  {searching ? "Searching..." : "Search"}
                </Button>
              </div>
              {searchResults?.error && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  {searchResults.error}
                </div>
              )}
              {searchResults && searchResults.success && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {(() => {
                      const tweets = searchResults.tweets;
                      const results = searchResults.results;
                      const count = Array.isArray(tweets) ? tweets.length : Array.isArray(results) ? results.length : 0;
                      return `${count} result${count !== 1 ? "s" : ""} from ${searchPlatform}`;
                    })()}
                  </p>
                  <div className="grid gap-3">
                    {searchPlatform === "twitter" && Array.isArray(searchResults.tweets) &&
                      searchResults.tweets.map((t: any) => (
                        <div key={t.id} className="border rounded-lg p-4 bg-background hover:bg-muted/30 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="shrink-0 w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                              <Twitter className="h-5 w-5 text-blue-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-muted-foreground">
                                @{t.author_id || "unknown"} • {t.created_at ? new Date(t.created_at).toLocaleString() : ""}
                              </p>
                              <p className="text-sm mt-1 whitespace-pre-wrap">{t.text}</p>
                              {t.public_metrics && (
                                <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                                  {t.public_metrics.like_count > 0 && <span>❤ {t.public_metrics.like_count}</span>}
                                  {t.public_metrics.retweet_count > 0 && <span>↻ {t.public_metrics.retweet_count}</span>}
                                  {t.public_metrics.reply_count > 0 && <span>💬 {t.public_metrics.reply_count}</span>}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    {searchPlatform === "facebook" && Array.isArray(searchResults.results) &&
                      searchResults.results.map((p: any, i: number) => (
                        <div key={p.id || i} className="border rounded-lg p-4 bg-background hover:bg-muted/30 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="shrink-0 w-10 h-10 rounded-full bg-blue-700/20 flex items-center justify-center">
                              <Facebook className="h-5 w-5 text-blue-700" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-muted-foreground">
                                {p.from?.name || "Unknown"} • {p.created_time ? new Date(p.created_time).toLocaleString() : ""}
                              </p>
                              <p className="text-sm mt-1 whitespace-pre-wrap">{p.message || p.story || "(No text)"}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    {searchPlatform === "instagram" && Array.isArray(searchResults.results) &&
                      searchResults.results.map((p: any, i: number) => (
                        <div key={p.pk || p.id || i} className="border rounded-lg p-4 bg-background hover:bg-muted/30 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500/20 flex items-center justify-center">
                              <Instagram className="h-5 w-5 text-purple-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-muted-foreground">
                                {p.username || p.full_name || "Unknown"} • {p.type === "post" && p.taken_at ? new Date(p.taken_at * 1000).toLocaleString() : ""}
                              </p>
                              <p className="text-sm mt-1 whitespace-pre-wrap line-clamp-3">
                                {p.caption?.text || p.biography || (p.type === "user" ? `User: ${p.username}` : "(Media)")}
                              </p>
                              {p.like_count !== undefined && (
                                <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                                  <span>❤ {p.like_count}</span>
                                  {p.comment_count !== undefined && <span>💬 {p.comment_count}</span>}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}