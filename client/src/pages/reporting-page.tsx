import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import PageTemplate from "@/components/modules/PageTemplate";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, BarChart3, Award, Calendar, FileIcon, Table2, Download } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "wouter";

async function downloadReport(format: "csv" | "json", days: number, type: string = "overview") {
  const jwt = localStorage.getItem("jwt");
  const headers: Record<string, string> = {};
  if (jwt) headers["Authorization"] = `Bearer ${jwt}`;

  const res = await fetch(`/api/enterprise/export/report?format=${format}&days=${days}&type=${type}`, {
    credentials: "include",
    headers,
  });
  if (!res.ok) throw new Error("Export failed");
  const blob = format === "json"
    ? new Blob([JSON.stringify(await res.json(), null, 2)], { type: "application/json" })
    : await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ewer-${type}-${new Date().toISOString().slice(0, 10)}.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadPdfReport(days: number, type: string = "overview") {
  const jwt = localStorage.getItem("jwt");
  const headers: Record<string, string> = {};
  if (jwt) headers["Authorization"] = `Bearer ${jwt}`;

  const res = await fetch(`/api/enterprise/export/report?format=json&days=${days}&type=${type}`, {
    credentials: "include",
    headers,
  });
  if (!res.ok) throw new Error("Export failed");
  const data = await res.json();

  const doc = new jsPDF();
  const dateStr = new Date().toISOString().slice(0, 10);
  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);

  // Header
  doc.setFontSize(18);
  doc.setTextColor(30, 58, 95);
  doc.text("EWERS Report", 14, 20);
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text(`${typeLabel} Report  |  Period: Last ${days} days  |  Generated: ${dateStr}`, 14, 28);
  doc.setDrawColor(30, 58, 95);
  doc.line(14, 31, 196, 31);

  let y = 38;

  if (type === "overview" && data.kpis) {
    doc.setFontSize(14);
    doc.setTextColor(30, 58, 95);
    doc.text("Key Performance Indicators", 14, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      head: [["Metric", "Value"]],
      body: [
        ["Total Incidents", String(data.kpis.totalIncidents)],
        ["Active Incidents", String(data.kpis.activeIncidents)],
        ["Critical Alerts", String(data.kpis.criticalAlerts)],
        ["Resolution Rate", `${data.kpis.resolutionRate}%`],
        ["Avg Response Time", `${data.kpis.avgResponseTimeHours} hrs`],
        ["High Risk Zones", String(data.kpis.highRiskZones)],
      ],
      theme: "striped",
      headStyles: { fillColor: [30, 58, 95] },
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    if (data.regionalHeatMap?.length) {
      doc.setFontSize(14);
      doc.setTextColor(30, 58, 95);
      doc.text("Regional Heat Map", 14, y);
      y += 4;
      autoTable(doc, {
        startY: y,
        head: [["Region", "State", "Incidents", "Active", "Risk Level"]],
        body: data.regionalHeatMap.map((r: any) => [r.region, r.state ?? "", r.incidentCount, r.activeCount, r.riskLevel]),
        theme: "striped",
        headStyles: { fillColor: [30, 58, 95] },
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    }

    if (data.trends?.length) {
      doc.setFontSize(14);
      doc.setTextColor(30, 58, 95);
      doc.text("Trend Data", 14, y);
      y += 4;
      autoTable(doc, {
        startY: y,
        head: [["Date", "Incidents", "Alerts"]],
        body: data.trends.map((t: any) => [t.date, t.incidents, t.alerts]),
        theme: "striped",
        headStyles: { fillColor: [30, 58, 95] },
      });
    }
  } else if (type === "incidents" && data.incidents?.length) {
    doc.setFontSize(14);
    doc.setTextColor(30, 58, 95);
    doc.text(`Incidents (${data.count} records)`, 14, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      head: [["ID", "Title", "Severity", "Status", "Region", "State", "Reported At"]],
      body: data.incidents.map((i: any) => [
        i.id, i.title?.slice(0, 30), i.severity, i.status, i.region ?? "", i.state ?? "",
        i.reportedAt ? new Date(i.reportedAt).toLocaleDateString() : "",
      ]),
      theme: "striped",
      headStyles: { fillColor: [30, 58, 95] },
      styles: { fontSize: 8 },
    });
  } else if (type === "risk" && data.regions?.length) {
    doc.setFontSize(14);
    doc.setTextColor(30, 58, 95);
    doc.text("Regional Risk Assessment", 14, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      head: [["Region", "State", "Incident Count", "Active Count", "Risk Level"]],
      body: data.regions.map((r: any) => [r.region, r.state ?? "", r.incidentCount, r.activeCount, r.riskLevel]),
      theme: "striped",
      headStyles: { fillColor: [30, 58, 95] },
    });
  } else if (type === "response") {
    if (data.kpis) {
      doc.setFontSize(14);
      doc.setTextColor(30, 58, 95);
      doc.text("Response Effectiveness", 14, y);
      y += 4;
      autoTable(doc, {
        startY: y,
        head: [["Metric", "Value"]],
        body: [
          ["Resolution Rate", `${data.kpis.resolutionRate}%`],
          ["Avg Response Time", `${data.kpis.avgResponseTimeHours} hrs`],
          ["Total Incidents", String(data.kpis.totalIncidents)],
          ["Active Incidents", String(data.kpis.activeIncidents)],
          ["Critical Alerts", String(data.kpis.criticalAlerts)],
        ],
        theme: "striped",
        headStyles: { fillColor: [30, 58, 95] },
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    }
    if (data.alerts?.length) {
      doc.setFontSize(14);
      doc.setTextColor(30, 58, 95);
      doc.text("Alerts", 14, y);
      y += 4;
      autoTable(doc, {
        startY: y,
        head: [["ID", "Title", "Severity", "Status", "Region", "Generated At"]],
        body: data.alerts.map((a: any) => [
          a.id, a.title?.slice(0, 35), a.severity, a.status, a.region ?? "",
          a.generatedAt ? new Date(a.generatedAt).toLocaleDateString() : "",
        ]),
        theme: "striped",
        headStyles: { fillColor: [30, 58, 95] },
        styles: { fontSize: 8 },
      });
    }
  } else {
    doc.setFontSize(12);
    doc.text("No data available for this report type.", 14, y);
  }

  // Footer on every page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`EWERS - Early Warning and Emergency Response System  |  Page ${i} of ${pageCount}`, 14, 290);
  }

  doc.save(`ewer-${type}-${dateStr}.pdf`);
}

export default function ReportingPage() {
  const [activeTab, setActiveTab] = useState("standard");
  const [exportDays, setExportDays] = useState("30");
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async (format: "csv" | "json", type: string = "overview") => {
    setExporting(true);
    try {
      await downloadReport(format, parseInt(exportDays), type);
      toast({ title: `Report exported as ${format.toUpperCase()}` });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handlePdfExport = async (type: string = "overview") => {
    setExporting(true);
    try {
      await downloadPdfReport(parseInt(exportDays), type);
      toast({ title: "Report exported as PDF" });
    } catch {
      toast({ title: "PDF export failed", variant: "destructive" });
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
  
  // Report definitions mapped to backend export types
  const reports = [
    { 
      id: 1, 
      name: "Quarterly Conflict Overview", 
      type: "Standard", 
      lastGenerated: new Date().toISOString(),
      format: "Excel",
      scheduled: true,
      exportType: "overview",
      exportFormat: "csv" as const,
    },
    { 
      id: 2, 
      name: "Monthly Risk Assessment", 
      type: "Standard", 
      lastGenerated: new Date().toISOString(),
      format: "Excel",
      scheduled: true,
      exportType: "risk",
      exportFormat: "csv" as const,
    },
    { 
      id: 3, 
      name: "Incident Data Export", 
      type: "Custom", 
      lastGenerated: new Date().toISOString(),
      format: "Excel",
      scheduled: false,
      exportType: "incidents",
      exportFormat: "csv" as const,
    },
    { 
      id: 4, 
      name: "Incident Response Effectiveness", 
      type: "KPI", 
      lastGenerated: new Date().toISOString(),
      format: "JSON",
      scheduled: false,
      exportType: "response",
      exportFormat: "json" as const,
    },
    { 
      id: 5, 
      name: "Early Warning Indicator Trends", 
      type: "Impact", 
      lastGenerated: new Date().toISOString(),
      format: "Excel",
      scheduled: true,
      exportType: "overview",
      exportFormat: "csv" as const,
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
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>Conflict Category Indicators</CardTitle>
              <CardDescription>
                Manage the general conflict indicators used across analysis and reporting from Admin settings.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Link href="/enterprise-settings">
                <Button variant="outline">Open Enterprise Settings</Button>
              </Link>
            </CardFooter>
          </Card>

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
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={exporting}
                          onClick={() => handleExport("json", report.exportType)}
                        >
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={exporting}
                          onClick={() => handleExport(report.exportFormat, report.exportType)}
                        >
                          {exporting ? "..." : "Generate"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={exporting}
                          onClick={() => handlePdfExport(report.exportType)}
                        >
                          <FileIcon className="h-3.5 w-3.5 mr-1 text-red-600" />
                          PDF
                        </Button>
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
                    <Button variant="outline" size="sm" onClick={() => handleExport("csv", "overview")} disabled={exporting}>
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
                    <Button variant="outline" size="sm" onClick={() => handleExport("csv", "incidents")} disabled={exporting}>
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
                    <Button variant="outline" size="sm" onClick={() => handleExport("csv", "risk")} disabled={exporting}>
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
                      <Button variant="outline" className="justify-start h-auto py-2" disabled={exporting} onClick={() => handleExport("csv", "incidents")}>
                        <div className="flex flex-col items-start">
                          <span className="text-sm">Incident Report</span>
                          <span className="text-xs text-muted-foreground">Conflict events</span>
                        </div>
                      </Button>
                      <Button variant="outline" className="justify-start h-auto py-2" disabled={exporting} onClick={() => handleExport("csv", "risk")}>
                        <div className="flex flex-col items-start">
                          <span className="text-sm">Risk Analysis</span>
                          <span className="text-xs text-muted-foreground">Risk assessment</span>
                        </div>
                      </Button>
                      <Button variant="outline" className="justify-start h-auto py-2" disabled={exporting} onClick={() => handleExport("csv", "response")}>
                        <div className="flex flex-col items-start">
                          <span className="text-sm">Response Summary</span>
                          <span className="text-xs text-muted-foreground">Response activities</span>
                        </div>
                      </Button>
                      <Button variant="outline" className="justify-start h-auto py-2" disabled={exporting} onClick={() => handleExport("csv", "overview")}>
                        <div className="flex flex-col items-start">
                          <span className="text-sm">Custom Analytics</span>
                          <span className="text-xs text-muted-foreground">Advanced analysis</span>
                        </div>
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <Button className="w-full" disabled={exporting} onClick={() => handleExport("csv", "overview")}>
                    {exporting ? "Generating..." : "Generate Full Report"}
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
                Export executive reports as CSV (Excel-compatible), JSON, or PDF.
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
                    onClick={() => handlePdfExport()}
                    disabled={exporting}
                  >
                    <FileIcon className="h-4 w-4 mr-2 text-red-600" />
                    Export PDF
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  CSV includes KPIs, regional heat map, and trend data. JSON includes full structured data. PDF generates a formatted report document.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageTemplate>
  );
}