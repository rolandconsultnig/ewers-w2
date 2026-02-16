import { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { RiskIndicator } from "@shared/schema";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  BarChart3, 
  PieChart as PieChartIcon, 
  Map, 
  Filter, 
  Download, 
  RefreshCw 
} from "lucide-react";

// Sample locations for the filter
const locations = [
  "All Regions",
  "Northern Province",
  "Eastern District",
  "Western Zone",
  "Southern Region",
  "Central Area",
  "Capital Region"
];

// Sample categories for the filter
const categories = [
  "All Indicators",
  "Armed Conflict",
  "Political Tension",
  "Resource Scarcity",
  "Displacement",
  "Hate Speech",
  "Social Unrest"
];

// Color array for charts
const COLORS = ['#1565C0', '#FF6D00', '#2E7D32', '#D32F2F', '#0288D1', '#F57C00', '#9C27B0'];

export default function AnalysisPage() {
  const [timeRange, setTimeRange] = useState("7");
  const [location, setLocation] = useState(locations[0]);
  const [category, setCategory] = useState(categories[0]);
  
  // Query risk indicators from the API
  const { data: indicators, isLoading, error, refetch } = useQuery<RiskIndicator[]>({
    queryKey: ["/api/risk-indicators"],
  });

  // Sample trend data (in a real app, this would come from filtered API data)
  const trendData = [
    { name: 'Mon', armedConflict: 10, hateSpeech: 15, displacement: 5 },
    { name: 'Tue', armedConflict: 20, hateSpeech: 13, displacement: 8 },
    { name: 'Wed', armedConflict: 15, hateSpeech: 18, displacement: 12 },
    { name: 'Thu', armedConflict: 25, hateSpeech: 20, displacement: 15 },
    { name: 'Fri', armedConflict: 30, hateSpeech: 25, displacement: 20 },
    { name: 'Sat', armedConflict: 35, hateSpeech: 22, displacement: 18 },
    { name: 'Sun', armedConflict: 25, hateSpeech: 25, displacement: 15 },
  ];

  // Sample categorical data
  const categoryData = [
    { name: 'Armed Conflict', value: 35 },
    { name: 'Political Tension', value: 25 },
    { name: 'Resource Scarcity', value: 18 },
    { name: 'Displacement', value: 15 },
    { name: 'Hate Speech', value: 12 },
    { name: 'Social Unrest', value: 10 },
    { name: 'Other', value: 5 },
  ];

  // Sample severity distribution data: Low=Green, Medium=Grey, High=Blue, Critical=Red
  const severityData = [
    { name: 'Critical', value: 10, color: '#ef4444' },
    { name: 'High', value: 25, color: '#3b82f6' },
    { name: 'Medium', value: 45, color: '#6b7280' },
    { name: 'Low', value: 30, color: '#22c55e' },
  ];

  // Sample regional comparison data
  const regionalData = [
    { name: 'Northern', armed: 40, political: 30, resource: 20 },
    { name: 'Eastern', armed: 30, political: 40, resource: 30 },
    { name: 'Western', armed: 20, political: 25, resource: 40 },
    { name: 'Southern', armed: 25, political: 35, resource: 25 },
    { name: 'Central', armed: 35, political: 20, resource: 15 }
  ];

  const handleRefresh = () => {
    refetch();
  };

  return (
    <MainLayout title="Risk Analysis">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-col md:flex-row gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={location} onValueChange={setLocation}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((loc) => (
                <SelectItem key={loc} value={loc}>{loc}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Advanced Filter
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="trends" className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 mb-8">
          <TabsTrigger value="trends">
            <TrendingUp className="h-4 w-4 mr-2" /> Trends
          </TabsTrigger>
          <TabsTrigger value="categorical">
            <PieChartIcon className="h-4 w-4 mr-2" /> Categorical
          </TabsTrigger>
          <TabsTrigger value="comparison">
            <BarChart3 className="h-4 w-4 mr-2" /> Regional
          </TabsTrigger>
          <TabsTrigger value="spatial">
            <Map className="h-4 w-4 mr-2" /> Spatial
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="trends">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Risk Indicator Trends</CardTitle>
                <CardDescription>
                  Tracking key indicators over the selected time period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={trendData}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="armedConflict" 
                        name="Armed Conflict"
                        stroke="#1565C0" 
                        strokeWidth={2}
                        activeDot={{ r: 8 }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="hateSpeech" 
                        name="Hate Speech"
                        stroke="#FF6D00" 
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="displacement" 
                        name="Displacement"
                        stroke="#2E7D32" 
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Severity Distribution</CardTitle>
                <CardDescription>
                  Distribution of incident severity levels
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={severityData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        isAnimationActive={true}
                        animationDuration={800}
                        animationBegin={0}
                      >
                        {severityData.map((entry, index) => (
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
          </div>
        </TabsContent>
        
        <TabsContent value="categorical">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Indicator Type Distribution</CardTitle>
                <CardDescription>
                  Breakdown of risk indicators by category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend layout="vertical" verticalAlign="middle" align="right" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Incident Source Analysis</CardTitle>
                <CardDescription>
                  Distribution of incidents by data source
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        {name: 'Field Reports', value: 45},
                        {name: 'Social Media', value: 30},
                        {name: 'News', value: 20},
                        {name: 'Community', value: 35},
                        {name: 'Sensors', value: 15},
                      ]}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" name="Number of Incidents" fill="#1565C0" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="comparison">
          <Card>
            <CardHeader>
              <CardTitle>Regional Indicator Comparison</CardTitle>
              <CardDescription>
                Comparing key risk indicators across different regions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={regionalData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="armed" name="Armed Conflict" stackId="a" fill="#1565C0" />
                    <Bar dataKey="political" name="Political Tension" stackId="a" fill="#FF6D00" />
                    <Bar dataKey="resource" name="Resource Scarcity" stackId="a" fill="#2E7D32" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="spatial">
          <Card>
            <CardHeader>
              <CardTitle>Spatial Analysis</CardTitle>
              <CardDescription>
                Geographic distribution of risk indicators
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[600px] bg-neutral-100 flex items-center justify-center">
                <div className="text-center">
                  <Map className="h-16 w-16 text-neutral-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Geographic Analysis Display</h3>
                  <p className="text-neutral-500 text-sm">
                    This feature requires MapBox or Leaflet integration
                  </p>
                  <Button className="mt-4">Configure Map Settings</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Analysis Insights</CardTitle>
            <CardDescription>
              Key observations and automatically detected patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="font-medium text-amber-800 flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-amber-600" />
                  Rising Trend Detected
                </h3>
                <p className="text-amber-700 mt-2 text-sm">
                  Armed conflict incidents in Northern Province have increased by 25% over the past week.
                </p>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-800 flex items-center">
                  <Map className="h-5 w-5 mr-2 text-blue-600" />
                  Geographic Correlation
                </h3>
                <p className="text-blue-700 mt-2 text-sm">
                  Resource scarcity indicators are highly correlated with displacement reports in Eastern District.
                </p>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-medium text-green-800 flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-green-600" />
                  Positive Development
                </h3>
                <p className="text-green-700 mt-2 text-sm">
                  Political tension indicators in Capital Region have decreased by 15% following mediation efforts.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
