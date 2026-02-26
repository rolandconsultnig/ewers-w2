import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Vote, Calendar, Building2, UserCircle, Users, Swords, ArrowRight, Newspaper } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { format } from "date-fns";

type Election = { id: number; name: string; type: string; region: string; state: string | null; electionDate: string; status: string };
type Party = { id: number; name: string; abbreviation: string | null };
type Politician = { id: number; fullName: string };
type Actor = { id: number; name: string; type: string };
type Event = { id: number; title: string; type: string; severity: string; description: string | null; eventDate: string };

export default function ElectionMonitoringDashboard() {
  const { data: elections = [] } = useQuery<Election[]>({
    queryKey: ["/api/elections"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/elections");
      return res.json();
    },
  });
  const { data: parties = [] } = useQuery<Party[]>({
    queryKey: ["/api/political-parties"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/political-parties");
      return res.json();
    },
  });
  const { data: politicians = [] } = useQuery<Politician[]>({
    queryKey: ["/api/politicians"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/politicians");
      return res.json();
    },
  });

  const mainElection = elections.find((e) => e.name.includes("2027") && (e.type === "presidential" || e.name.toLowerCase().includes("presidential"))) ?? elections[0];
  const { data: electionEvents = [] } = useQuery<Event[]>({
    queryKey: mainElection ? [`/api/elections/${mainElection.id}/events`] : ["election-events-none"],
    queryFn: async () => {
      if (!mainElection) return [];
      const res = await apiRequest("GET", `/api/elections/${mainElection.id}/events`);
      return res.json();
    },
    enabled: !!mainElection,
  });

  const preElection = elections.filter((e) => e.status === "pre_election" || e.status === "ongoing");
  const postElection = elections.filter((e) => e.status === "post_election" || e.status === "completed");
  const totalActors = elections.length ? "—" : 0;
  const totalEvents = elections.length ? "—" : 0;

  const quickLinks = [
    { path: "/election-monitoring/elections", label: "Elections", icon: Calendar, desc: "Pre-election & post-election cycles", count: elections.length },
    { path: "/election-monitoring/parties", label: "Political Parties", icon: Building2, desc: "Parties and abbreviations", count: parties.length },
    { path: "/election-monitoring/politicians", label: "Politicians", icon: UserCircle, desc: "Candidates and office holders", count: politicians.length },
    { path: "/election-monitoring/actors", label: "Actors & Non-Actors", icon: Users, desc: "INEC, CSOs, security, media", count: totalActors },
    { path: "/election-monitoring/violence", label: "Violence & Events", icon: Swords, desc: "Violence, intimidation, fraud", count: totalEvents },
  ];

  return (
    <MainLayout title="Election Monitoring">
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Vote className="h-8 w-8" />
            Election Monitoring
          </h1>
          <p className="text-muted-foreground mt-1">
            Pre-election and post-election monitoring: track elections, political parties, politicians, actors, and violence or violations.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pre-Election</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{preElection.length}</div>
              <p className="text-xs text-muted-foreground">Upcoming / ongoing elections</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Post-Election</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{postElection.length}</div>
              <p className="text-xs text-muted-foreground">Completed / post-election</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Political Parties</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{parties.length}</div>
              <p className="text-xs text-muted-foreground">Registered parties</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Politicians</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{politicians.length}</div>
              <p className="text-xs text-muted-foreground">Candidates / officials</p>
            </CardContent>
          </Card>
        </div>

        {/* Election news 2026 */}
        {electionEvents.length > 0 && (
          <Card className="border-l-4 border-l-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Newspaper className="h-5 w-5" />
                Election news 2026
              </CardTitle>
              <CardDescription>
                Timetable, primaries, campaign periods, and key updates for the 2027 polls. Run <code className="text-xs bg-muted px-1 rounded">npm run db:seed:election-2026</code> to load more.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 max-h-64 overflow-y-auto">
                {electionEvents.slice(0, 12).map((ev) => (
                  <li key={ev.id} className="text-sm border-b border-border/50 pb-2 last:border-0 last:pb-0">
                    <div className="flex items-start gap-2 flex-wrap">
                      <Badge variant="outline" className="shrink-0 capitalize text-xs">{ev.severity}</Badge>
                      <span className="text-muted-foreground shrink-0">{format(new Date(ev.eventDate), "MMM d, yyyy")}</span>
                    </div>
                    <p className="font-medium mt-0.5">{ev.title}</p>
                    {ev.description && <p className="text-muted-foreground text-xs mt-0.5 line-clamp-2">{ev.description}</p>}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-3 mt-3">
              <Link href="/election-monitoring/news">
                <span className="inline-flex items-center gap-1 text-sm text-primary cursor-pointer hover:underline">
                  Full news feed <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
              <Link href="/election-monitoring/violence">
                <span className="inline-flex items-center gap-1 text-sm text-primary cursor-pointer hover:underline">
                  All events & violence <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Elections</CardTitle>
              <CardDescription>Latest election cycles</CardDescription>
            </CardHeader>
            <CardContent>
              {elections.length === 0 ? (
                <p className="text-sm text-muted-foreground">No elections yet. Add one from the Elections page.</p>
              ) : (
                <ul className="space-y-2">
                  {elections.slice(0, 5).map((e) => (
                    <li key={e.id} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{e.name}</span>
                      <span className="text-muted-foreground">{format(new Date(e.electionDate), "MMM d, yyyy")} · {e.status}</span>
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/election-monitoring/elections">
                <span className="inline-flex items-center gap-1 text-sm text-primary mt-2 cursor-pointer hover:underline">
                  View all <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Quick access</CardTitle>
              <CardDescription>Election monitoring modules</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              {quickLinks.map(({ path, label, icon: Icon, desc, count }) => (
                <Link key={path} href={path}>
                  <span className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{label}</p>
                      <p className="text-xs text-muted-foreground truncate">{desc}</p>
                    </div>
                    {typeof count === "number" && <span className="text-sm text-muted-foreground">{count}</span>}
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
