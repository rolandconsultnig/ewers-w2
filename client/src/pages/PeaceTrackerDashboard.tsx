import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useIncidentData } from "@/hooks/useIncidentData";
import { crisisTypes } from "@/lib/crisis-constants";
import { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { Incident } from "@shared/schema";
import { SocialMediaMonitor } from "@/components/SocialMediaMonitor";
import { SmsMonitor } from "@/components/SmsMonitor";
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  MapPin, 
  Clock, 
  Brain,
  Globe,
  Bot,
  Mic,
  Shield,
  Activity
} from "lucide-react";

export default function PeaceTrackerDashboard() {
  const { incidents } = useIncidentData();
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);

  const getIncidentByCategory = () => {
    const counts: Record<string, number> = {};
    Object.keys(crisisTypes).forEach((type) => {
      counts[type] = 0;
    });
    incidents.forEach((incident) => {
      const cat = incident.category || "political";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts)
      .filter(([, count]) => count > 0)
      .map(([type, count]) => ({
        name: crisisTypes[type]?.label || type,
        value: count,
        color: crisisTypes[type]?.color || "#8884d8",
      }));
  };

  const getIncidentByStatus = () => {
    const statusCounts: Record<string, number> = { active: 0, pending: 0, resolved: 0 };
    incidents.forEach((incident) => {
      const s = incident.status === "resolved" ? "resolved" : incident.status === "active" ? "active" : "pending";
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    });
    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      color: status === "active" ? "#F1C40F" : status === "pending" ? "#E74C3C" : "#2ECC71",
    }));
  };

  const getLatestReports = (count: number): Incident[] => {
    return [...incidents]
      .sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime())
      .slice(0, count);
  };

  // Get regional statistics
  const getRegionalStats = () => {
    const regionCounts: Record<string, number> = {};
    incidents.forEach((incident) => {
      const region = incident.region || 'Unknown';
      regionCounts[region] = (regionCounts[region] || 0) + 1;
    });
    return Object.entries(regionCounts)
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => b.count - a.count);
  };

  // Get severity distribution
  const getSeverityStats = () => {
    const severityCounts: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    incidents.forEach((incident) => {
      const severity = incident.severity || 'low';
      severityCounts[severity] = (severityCounts[severity] || 0) + 1;
    });
    return Object.entries(severityCounts).map(([severity, count]) => ({
      name: severity.charAt(0).toUpperCase() + severity.slice(1),
      value: count,
      color: severity === 'critical' ? '#ef4444' :   // Red
             severity === 'high' ? '#3b82f6' :       // Blue
             severity === 'medium' ? '#6b7280' :     // Grey
             '#22c55e'                               // Green (low)
    }));
  };

  // Get monthly trend data
  const getMonthlyTrends = () => {
    const monthlyData: Record<string, number> = {};
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      return date.toISOString().slice(0, 7); // YYYY-MM format
    }).reverse();

    last6Months.forEach(month => {
      monthlyData[month] = 0;
    });

    incidents.forEach((incident) => {
      const month = new Date(incident.reportedAt).toISOString().slice(0, 7);
      if (monthlyData.hasOwnProperty(month)) {
        monthlyData[month]++;
      }
    });

    return last6Months.map(month => ({
      month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      incidents: monthlyData[month]
    }));
  };

  // Get reporting method statistics
  const getReportingMethodStats = () => {
    const methodCounts: Record<string, number> = {};
    incidents.forEach((incident) => {
      const method = incident.reportingMethod || 'text';
      methodCounts[method] = (methodCounts[method] || 0) + 1;
    });
    return Object.entries(methodCounts).map(([method, count]) => ({
      method: method.charAt(0).toUpperCase() + method.slice(1),
      count,
      percentage: ((count / incidents.length) * 100).toFixed(1)
    }));
  };

  // Get verification status stats
  const getVerificationStats = () => {
    const verificationCounts: Record<string, number> = {};
    incidents.forEach((incident) => {
      const status = incident.verificationStatus || 'unverified';
      verificationCounts[status] = (verificationCounts[status] || 0) + 1;
    });
    return verificationCounts;
  };

  // Load AI insights
  const loadAiInsights = async () => {
    setIsLoadingInsights(true);
    try {
      // Load pattern detection
      const patternResponse = await fetch('/api/ai/detect-patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ timeframeDays: 30 })
      });

      let patterns = null;
      if (patternResponse.ok) {
        patterns = await patternResponse.json();
      }

      // Load peace opportunities
      const peaceResponse = await fetch('/api/ai/peace-opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ timeframeDays: 30 })
      });

      let peaceOpportunities = null;
      if (peaceResponse.ok) {
        peaceOpportunities = await peaceResponse.json();
      }

      setAiInsights({ patterns, peaceOpportunities });
    } catch (error) {
      console.error('Failed to load AI insights:', error);
    } finally {
      setIsLoadingInsights(false);
    }
  };

  // Load AI insights on component mount
  useEffect(() => {
    if (incidents.length > 0) {
      loadAiInsights();
    }
  }, [incidents.length]);

  const crisisByTypeData = getIncidentByCategory();
  const crisisByStatusData = getIncidentByStatus();
  const latestReports = getLatestReports(5);
  const regionalStats = getRegionalStats();
  const severityStats = getSeverityStats();
  const monthlyTrends = getMonthlyTrends();
  const reportingMethodStats = getReportingMethodStats();
  const verificationStats = getVerificationStats();

  const getCategoryInfo = (cat: string) => crisisTypes[cat] || { color: "#8884d8", label: cat };

  // Calculate key metrics
  const totalIncidents = incidents.length;
  const activeIncidents = incidents.filter(i => i.status === 'active').length;
  const criticalIncidents = incidents.filter(i => i.severity === 'critical').length;
  const voiceReports = incidents.filter(i => i.reportingMethod === 'voice').length;
  const pinnedIncidents = incidents.filter(i => i.isPinned).length;
  const verifiedIncidents = incidents.filter(i => i.verificationStatus === 'verified').length;
  const totalImpactedPopulation = incidents.reduce((sum, i) => sum + (i.impactedPopulation || 0), 0);

  // Calculate trends
  const last30Days = incidents.filter(i => {
    const incidentDate = new Date(i.reportedAt);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return incidentDate >= thirtyDaysAgo;
  }).length;

  const previous30Days = incidents.filter(i => {
    const incidentDate = new Date(i.reportedAt);
    const sixtyDaysAgo = new Date();
    const thirtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return incidentDate >= sixtyDaysAgo && incidentDate < thirtyDaysAgo;
  }).length;

  const trendPercentage = previous30Days > 0 ? 
    ((last30Days - previous30Days) / previous30Days * 100).toFixed(1) : 
    '0';
  const isIncreasing = parseFloat(trendPercentage) > 0;

  return (
    <MainLayout title="Crisis Monitoring Dashboard">
    <div className="container mx-auto py-6 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Crisis Monitoring Dashboard</h1>
        <div className="flex gap-2">
          <Button onClick={loadAiInsights} disabled={isLoadingInsights} variant="outline">
            <Brain className="h-4 w-4 mr-2" />
            {isLoadingInsights ? 'Loading...' : 'Refresh AI Insights'}
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center">
              <Activity className="h-4 w-4 mr-2" />
              Total Incidents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalIncidents}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {isIncreasing ? <TrendingUp className="h-3 w-3 mr-1 text-red-500" /> : <TrendingDown className="h-3 w-3 mr-1 text-green-500" />}
              {Math.abs(parseFloat(trendPercentage))}% vs last month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2 text-red-500" />
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{activeIncidents}</div>
            <p className="text-xs text-muted-foreground">Immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center">
              <Shield className="h-4 w-4 mr-2 text-orange-500" />
              Critical
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{criticalIncidents}</div>
            <p className="text-xs text-muted-foreground">High severity</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center">
              <Mic className="h-4 w-4 mr-2 text-blue-500" />
              Voice Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{voiceReports}</div>
            <p className="text-xs text-muted-foreground">Audio incidents</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center">
              <Users className="h-4 w-4 mr-2 text-purple-500" />
              Impact
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {totalImpactedPopulation.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">People affected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center">
              <Clock className="h-4 w-4 mr-2 text-green-500" />
              Verified
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {Math.round((verifiedIncidents / totalIncidents) * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">Verification rate</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights Section */}
      {aiInsights && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {aiInsights.patterns && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Brain className="h-5 w-5 mr-2 text-purple-500" />
                  AI Pattern Detection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Patterns Detected</span>
                    <Badge variant="outline">{aiInsights.patterns.summary.totalPatterns}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Critical Patterns</span>
                    <Badge className="bg-red-100 text-red-800">{aiInsights.patterns.summary.criticalPatterns}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Emerging Threats</span>
                    <Badge className="bg-amber-100 text-amber-800">{aiInsights.patterns.summary.emergingThreats}</Badge>
                  </div>
                  {aiInsights.patterns.patterns.length > 0 && (
                    <div className="mt-3 p-2 bg-purple-50 rounded-md">
                      <p className="text-xs font-medium text-purple-800">Latest Pattern:</p>
                      <p className="text-xs text-purple-700">{aiInsights.patterns.patterns[0].title}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {aiInsights.peaceOpportunities && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Globe className="h-5 w-5 mr-2 text-green-500" />
                  Peace Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Opportunities Found</span>
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      {aiInsights.peaceOpportunities.summary.totalOpportunities}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">High Priority</span>
                    <Badge className="bg-green-100 text-green-800">
                      {aiInsights.peaceOpportunities.summary.highPriorityOpportunities}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Optimal Windows</span>
                    <Badge className="bg-blue-100 text-blue-800">
                      {aiInsights.peaceOpportunities.summary.optimalWindows}
                    </Badge>
                  </div>
                  {aiInsights.peaceOpportunities.opportunities.length > 0 && (
                    <div className="mt-3 p-2 bg-green-50 rounded-md">
                      <p className="text-xs font-medium text-green-800">Top Opportunity:</p>
                      <p className="text-xs text-green-700">{aiInsights.peaceOpportunities.opportunities[0].title}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Incident Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="incidents" stroke="#3B82F6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Severity Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    isAnimationActive={true}
                    animationDuration={800}
                    animationBegin={0}
                  >
                    {severityStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Regional Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {regionalStats.slice(0, 6).map((region, index) => (
                <div key={region.region} className="flex justify-between items-center">
                  <span className="text-sm font-medium">{region.region}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(region.count / totalIncidents) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-8">{region.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Reporting Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reportingMethodStats.map((method, index) => (
                <div key={method.method} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {method.method === 'Voice' && <Mic className="h-4 w-4 text-blue-500" />}
                    {method.method === 'Text' && <Activity className="h-4 w-4 text-green-500" />}
                    {method.method === 'Sms' && <MapPin className="h-4 w-4 text-purple-500" />}
                    <span className="text-sm font-medium">{method.method}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{method.percentage}%</span>
                    <Badge variant="outline">{method.count}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Verification Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(verificationStats).map(([status, count]) => (
                <div key={status} className="flex justify-between items-center">
                  <span className="text-sm font-medium capitalize">{status.replace('_', ' ')}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {((count / totalIncidents) * 100).toFixed(1)}%
                    </span>
                    <Badge 
                      className={
                        status === 'verified' ? 'bg-green-100 text-green-800' :
                        status === 'partially_verified' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }
                    >
                      {count}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Latest Incident Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Type</th>
                    <th className="text-left py-3 px-4">Location</th>
                    <th className="text-left py-3 px-4">Severity</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Reported</th>
                  </tr>
                </thead>
                <tbody>
                  {latestReports.map((report) => {
                    const info = getCategoryInfo(report.category);
                    return (
                      <tr key={report.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <span
                              className="w-3 h-3 rounded-full mr-2"
                              style={{ backgroundColor: info.color }}
                            />
                            {info.label}
                          </div>
                        </td>
                        <td className="py-3 px-4">{report.location}</td>
                        <td className="py-3 px-4">{report.severity}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              report.status === "active"
                                ? "bg-yellow-100 text-yellow-800"
                                : report.status === "pending"
                                ? "bg-orange-100 text-orange-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {new Date(report.reportedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                  {latestReports.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-muted-foreground">
                        No incident reports available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        <SocialMediaMonitor />
      </div>

      <div className="mb-6">
        <SmsMonitor />
      </div>
    </div>
    </MainLayout>
  );
}
