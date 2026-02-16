import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import PageTemplate from "@/components/modules/PageTemplate";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, BarChart3, Award, Calendar, FileIcon, Table2, Download, Printer } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

async function downloadReport(format: "csv" | "json", days: number) {
  const res = await fetch(`/api/enterprise/export/report?format=${format}&days=${days}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Export failed");
  const blob = format === "json"
    ? new Blob([JSON.stringify(await res.json(), null, 2)], { type: "application/json" })
    : await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ewer-report-${new Date().toISOString().slice(0, 10)}.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportingPage() {
  const [activeTab, setActiveTab] = useState("standard");
  const [exportDays, setExportDays] = useState("30");
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async (format: "csv" | "json") => {
    setExporting(true);
    try {
      await downloadReport(format, parseInt(exportDays));
      toast({ title: `Report exported as ${format.toUpperCase()}` });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const toolbar = (
    <>
      <Button variant="outline">
        <Calendar className="h-4 w-4 mr-2" />
        Schedule Reports
      </Button>
      <Button>
        <FileText className="h-4 w-4 mr-2" />
        New Report
      </Button>
    </>
  );
  
  // Sample report data
  const reports = [
    { 
      id: 1, 
      name: "Quarterly Conflict Overview", 
      type: "Standard", 
      lastGenerated: "2023-03-15T14:30:00",
      format: "PDF",
      scheduled: true
    },
    { 
      id: 2, 
      name: "Monthly Risk Assessment", 
      type: "Standard", 
      lastGenerated: "2023-03-01T10:15:00",
      format: "Excel",
      scheduled: true
    },
    { 
      id: 3, 
      name: "Regional Security Analysis", 
      type: "Custom", 
      lastGenerated: "2023-02-20T16:45:00",
      format: "PDF",
      scheduled: false
    },
    { 
      id: 4, 
      name: "Incident Response Effectiveness", 
      type: "KPI", 
      lastGenerated: "2023-02-15T09:30:00",
      format: "Dashboard",
      scheduled: false
    },
    { 
      id: 5, 
      name: "Early Warning Indicator Trends", 
      type: "Impact", 
      lastGenerated: "2023-02-10T13:20:00",
      format: "Excel",
      scheduled: true
    },
  ];
  
  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };
  
  // Report type badge styling
  const getReportTypeBadge = (type: string) => {
    switch(type) {
      case "Standard":
        return <Badge className="bg-blue-100 text-blue-800">Standard</Badge>;
      case "Custom":
        return <Badge className="bg-purple-100 text-purple-800">Custom</Badge>;
      case "KPI":
        return <Badge className="bg-amber-100 text-amber-800">KPI</Badge>;
      case "Impact":
        return <Badge className="bg-green-100 text-green-800">Impact</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };
  
  // Format icon
  const getFormatIcon = (format: string) => {
    switch(format) {
      case "PDF":
        return <FileIcon className="h-4 w-4 text-red-600" />;
      case "Excel":
        return <Table2 className="h-4 w-4 text-green-600" />;
      case "Dashboard":
        return <BarChart3 className="h-4 w-4 text-blue-600" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };
  
  return (
    <PageTemplate 
      title="Reporting & Evaluation"
      description="Generate reports and evaluate program effectiveness"
      toolbar={toolbar}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 h-auto p-1">
          <TabsTrigger value="standard" className="py-2">
            <FileText className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Report Builder</span>
            <span className="md:hidden">Reports</span>
          </TabsTrigger>
          <TabsTrigger value="kpi" className="py-2">
            <BarChart3 className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">KPI Tracking</span>
            <span className="md:hidden">KPIs</span>
          </TabsTrigger>
          <TabsTrigger value="impact" className="py-2">
            <Award className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Impact Evaluation</span>
            <span className="md:hidden">Impact</span>
          </TabsTrigger>
          <TabsTrigger value="export" className="py-2">
            <Calendar className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Scheduled Delivery</span>
            <span className="md:hidden">Delivery</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="standard" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Standard & Custom Report Builder</CardTitle>
              <CardDescription>
                Create and manage standard and custom reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Last Generated</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">{report.name}</TableCell>
                      <TableCell>{getReportTypeBadge(report.type)}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {getFormatIcon(report.format)}
                          <span className="ml-2">{report.format}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(report.lastGenerated)}</TableCell>
                      <TableCell>
                        <Switch checked={report.scheduled} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">View</Button>
                        <Button variant="ghost" size="sm">Generate</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Standard Reports</CardTitle>
                <CardDescription>Pre-configured system reports</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FileIcon className="h-5 w-5 text-red-600 mr-3" />
                      <div>
                        <h4 className="text-sm font-medium">Monthly Security Overview</h4>
                        <p className="text-xs text-muted-foreground">Comprehensive monthly security analysis</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleExport("csv")} disabled={exporting}>
                      {exporting ? "..." : "Generate"}
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Table2 className="h-5 w-5 text-green-600 mr-3" />
                      <div>
                        <h4 className="text-sm font-medium">Incident Statistics</h4>
                        <p className="text-xs text-muted-foreground">Detailed incident data export (CSV/Excel)</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleExport("csv")} disabled={exporting}>
                      {exporting ? "..." : "Export CSV"}
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FileIcon className="h-5 w-5 text-red-600 mr-3" />
                      <div>
                        <h4 className="text-sm font-medium">Regional Risk Assessment</h4>
                        <p className="text-xs text-muted-foreground">Risk analysis by Nigerian region</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleExport("csv")} disabled={exporting}>
                      {exporting ? "..." : "Export CSV"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Custom Report Builder</CardTitle>
                <CardDescription>Create customized reports</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Build custom reports with specific data points, filtering options, and visualization preferences.
                </p>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Select Report Type</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" className="justify-start h-auto py-2">
                        <div className="flex flex-col items-start">
                          <span className="text-sm">Incident Report</span>
                          <span className="text-xs text-muted-foreground">Conflict events</span>
                        </div>
                      </Button>
                      <Button variant="outline" className="justify-start h-auto py-2">
                        <div className="flex flex-col items-start">
                          <span className="text-sm">Risk Analysis</span>
                          <span className="text-xs text-muted-foreground">Risk assessment</span>
                        </div>
                      </Button>
                      <Button variant="outline" className="justify-start h-auto py-2">
                        <div className="flex flex-col items-start">
                          <span className="text-sm">Response Summary</span>
                          <span className="text-xs text-muted-foreground">Response activities</span>
                        </div>
                      </Button>
                      <Button variant="outline" className="justify-start h-auto py-2">
                        <div className="flex flex-col items-start">
                          <span className="text-sm">Custom Analytics</span>
                          <span className="text-xs text-muted-foreground">Advanced analysis</span>
                        </div>
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <Button className="w-full">
                    Launch Report Builder
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="kpi" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Key Performance Indicator (KPI) Tracking</CardTitle>
              <CardDescription>
                Track and monitor key performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center p-6 text-center">
                <div>
                  <BarChart3 className="h-20 w-20 text-blue-400 mx-auto mb-4 opacity-70" />
                  <h3 className="text-lg font-medium">KPI Tracking Module</h3>
                  <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                    This module will provide KPI definition tools, performance metric tracking, and goal achievement visualization.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="impact" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Impact Evaluation Tools</CardTitle>
              <CardDescription>
                Evaluate program effectiveness and impact
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center p-6 text-center">
                <div>
                  <Award className="h-20 w-20 text-blue-400 mx-auto mb-4 opacity-70" />
                  <h3 className="text-lg font-medium">Impact Evaluation Module</h3>
                  <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                    This module will offer outcome measurement tools, before/after analysis, and intervention effectiveness evaluation.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="export" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Report Export & Delivery</CardTitle>
              <CardDescription>
                Export executive reports as CSV (Excel-compatible) or JSON. Use Print to save as PDF.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Period:</span>
                    <Select value={exportDays} onValueChange={setExportDays}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 days</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                        <SelectItem value="365">1 year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() => handleExport("csv")}
                    disabled={exporting}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV (Excel)
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleExport("json")}
                    disabled={exporting}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Export JSON
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.print()}
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print / Save as PDF
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  CSV includes KPIs, regional heat map, and trend data. JSON includes full structured data. Use your browser&apos;s Print dialog to save the current page as PDF.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageTemplate>
  );
}