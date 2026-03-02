# EWERS User Manual

**Early Warning and Early Response System**
*Institute for Peace and Conflict Resolution (IPCR), Nigeria*

---

**Version:** 2.0
**Last Updated:** March 2026
**Designed by:** [afrinict.com](https://afrinict.com)

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Getting Started](#2-getting-started)
3. [Public Features (No Login Required)](#3-public-features-no-login-required)
4. [Main Navigation](#4-main-navigation)
5. [AI Assistant](#5-ai-assistant)
6. [Data Management](#6-data-management)
7. [Election Monitoring](#7-election-monitoring)
8. [Risk Assessment](#8-risk-assessment)
9. [Response Management](#9-response-management)
10. [Communications](#10-communications)
11. [Social Media Monitoring](#11-social-media-monitoring)
12. [Administration](#12-administration)
13. [User Roles and Permissions](#13-user-roles-and-permissions)
14. [Language Support](#14-language-support)
15. [Troubleshooting](#15-troubleshooting)

---

## 1. Introduction

The **Early Warning and Early Response System (EWERS)** is a comprehensive conflict monitoring, analysis, and response platform developed for the Institute for Peace and Conflict Resolution (IPCR), Nigeria. The system enables real-time tracking of incidents across all Nigerian regions, AI-powered analysis, and coordinated response management.

### Key Capabilities

- **Real-time incident monitoring** across all 36 states and the FCT
- **AI-powered conflict analysis** and predictive modelling
- **Interactive crisis map** with satellite and street view layers
- **Multi-channel reporting** — web form, voice recording, SMS, and social media
- **Election monitoring** for tracking political violence and events
- **Collaborative communications** — chat, internal email, voice and video calls
- **Automated alerts** with configurable notification rules
- **Peace Opportunity Indicators** tracking
- **Multi-language support** — English, Igbo, Hausa, and Yoruba

---

## 2. Getting Started

### 2.1 Accessing the Application

Open your web browser and navigate to the application URL provided by your administrator (e.g., `http://your-server-address`).

### 2.2 Home Page

The **Home Page** is the public landing page visible to all visitors. It provides:

- Information about the Institute for Peace and Conflict Resolution
- A profile of the Director General
- Quick links to report an incident (online or by voice)
- Information on peace initiatives
- Contact details and external links
- A language selector (top-right corner)

### 2.3 Logging In

1. Click the **Login** button in the top-right corner of the Home Page.
2. Enter your **Username** (minimum 3 characters) and **Password** (minimum 6 characters).
3. Click **Sign In**.
4. Upon successful login, you will be redirected to the **Dashboard**.

> **Forgot your password?** Click the "Forgot Password" link on the login page to initiate a password reset via email.

### 2.4 Sidebar Navigation

After logging in, the application displays a **sidebar** on the left side with collapsible navigation groups:

| Group | Description |
|-------|-------------|
| **Main Navigation** | Dashboard, Executive Dashboard, Situation Room, Conflict Management, Crisis Map, Search |
| **AI Assistant** | AI Analysis, Predictive Models, Response Advisor, Peace Opportunity Indicators |
| **Data Management** | Data Collection, Data Processing, Collected Data, Processed Data |
| **Election Monitoring** | Dashboard, Election News, Elections, Political Parties, Politicians, Actors, Violence & Events |
| **Risk Assessment** | Risk Assessment, Visualization |
| **Response Management** | Alerts, Incident Review, Voice Incident Report, Case Management, Response Plans |
| **Communications** | Chat, Internal Email, Voice & Video Calls, SMS Management, Compose SMS, SMS Templates, Messaging Logs |
| **Social Media** | Social Dashboard, X (Twitter), Facebook, Instagram, TikTok |
| **Administration** | Audit Logs, Enterprise Settings, User Management, Integrations, Reporting, Settings |

Click any group header to **expand or collapse** it. Click a menu item to navigate to that page.

### 2.5 Logging Out

Click the **logout icon** (arrow) at the bottom-left corner of the sidebar next to your profile name.

---

## 3. Public Features (No Login Required)

These features are accessible to anyone without logging in:

### 3.1 Report an Incident (Online)

**Path:** Home Page → "Report Incident Online" button, or navigate to `/report-incident`

1. Fill in the incident details including title, description, location, severity, and category.
2. Provide any supporting information.
3. Submit the report.

Reports submitted publicly are added to the system and visible to authenticated staff.

### 3.2 Report by Voice

**Path:** Home Page → "Report by Voice" button, or navigate to `/report-by-voice`

1. Click the **Record** button to start recording.
2. Describe the incident in your own words.
3. Stop the recording and submit.
4. The system will automatically transcribe your voice message and create an incident report.

### 3.3 Nigeria Crisis Map

**Path:** Navigate to `/map`

The interactive map is publicly viewable and shows:

- Incident markers color-coded by severity (Red = High, Orange = Medium, Blue = Low, Gold = Pinned)
- Multiple base map layers (OpenStreetMap, Esri Satellite, Carto, Topographic)
- Click any marker to view incident details in a popup

**Map Controls:**
- **Layer Switcher** (top-right): Toggle between satellite imagery, street maps, and topographic views
- **Zoom**: Use the + / - buttons or scroll wheel
- **Pinned Only Toggle**: Filter to show only pinned (priority) incidents
- **Expand/Reduce**: Resize the map display area

---

## 4. Main Navigation

### 4.1 Dashboard

**Path:** `/dashboard`

The main operational dashboard providing an at-a-glance summary of the system status:

- **Incident summary** — total count, active, pending, resolved
- **Regional breakdown** — incidents by Nigerian region
- **Category distribution** — pie chart of incident types (violence, natural disaster, protest, etc.)
- **Severity distribution** — breakdown by low, medium, high, and critical
- **Recent incidents** — chronological list of latest reports
- **Quick actions** — navigate to key pages

### 4.2 Executive Dashboard

**Path:** `/executive`

A high-level strategic overview designed for senior leadership:

- Key performance indicators (KPIs)
- Trend analysis and charts
- Regional heatmaps
- Quick links to Alerts, Conflict Management, Crisis Map, and Reporting

### 4.3 Situation Room

**Path:** `/internal`

The internal situation room (PeaceTracker Internal Dashboard) provides real-time monitoring:

- Live social media monitoring feed
- SMS monitoring
- Active incident tracking
- Incident detail modals with AI-generated recommendations

### 4.4 Conflict Management

**Path:** `/crises`

Manage and review all conflict reports:

1. **Search**: Use the search bar to find conflicts by title, description, or location.
2. **Filter by Status**: All Status, Active, Pending, or Resolved.
3. **Filter by Severity**: All, Low, Medium, High, or Critical.
4. **View Details**: Click the "View Details" button on any conflict to open a detailed modal showing:
   - Full incident information (title, description, location, region, state, reported date)
   - Severity and status badges
   - Category label with color indicator
   - **AI Recommendations** — automated analysis and suggested actions (requires AI service configuration)
   - Option to **Create Alert** from the incident
   - Link to **View All Alerts**

### 4.5 Nigeria Crisis Map

**Path:** `/map`

See [Section 3.3](#33-nigeria-crisis-map) for full details. When logged in, additional features are available:

- **Pin/Unpin incidents** — Click a marker, then toggle the pin button to prioritize incidents
- **Add new incidents** directly on the map by clicking a location

### 4.6 Search

**Path:** `/search`

A global search interface to find incidents, alerts, and other records across the entire system.

---

## 5. AI Assistant

### 5.1 AI Analysis

**Path:** `/ai-analysis`

Leverage AI-powered analysis of conflict data:

- Submit conflict scenarios for analysis
- Get detailed breakdown of contributing factors
- Receive strategic recommendations
- Analyze patterns across multiple incidents

> **Requires:** A configured AI API key (`DEEPSEEK_API_KEY` or `OPENAI_API_KEY`) on the server.

### 5.2 Predictive Models

**Path:** `/ai-prediction`

Access AI-powered predictive conflict modelling:

- Generate conflict forecasts for specific regions
- View probability assessments for various conflict scenarios
- Analyse trending risk factors

### 5.3 Response Advisor

**Path:** `/ai-advisor`

Get AI-generated recommendations for incident response:

- Input incident parameters
- Receive tailored response strategies
- Access best-practice recommendations

### 5.4 Peace Opportunity Indicators

**Path:** `/peace-indicators`

Monitor and track indicators of peace opportunities across Nigeria:

- View positive development indicators by region
- Track community peacebuilding activities
- Monitor early signs of de-escalation

---

## 6. Data Management

### 6.1 Data Collection

**Path:** `/data-collection`

Configure and manage data sources feeding into the system:

- **Add data sources** — define new sources (social media, news, government reports, NGO reports, satellite, field reports)
- **Configure API endpoints** — set up automated data ingestion
- **Set collection frequency** — real-time, hourly, daily, or weekly
- **Monitor source status** — active, inactive, or error states

### 6.2 Data Processing

**Path:** `/data-processing`

View and manage data processing pipelines:

- Monitor data transformation status
- Configure processing rules
- View processing logs and errors

### 6.3 Collected Data

**Path:** `/collected-data`

Browse all raw data collected from various sources before processing.

### 6.4 Processed Data

**Path:** `/processed-data`

Browse processed and enriched data ready for analysis and reporting.

---

## 7. Election Monitoring

A dedicated module for tracking election-related activities and violence.

### 7.1 Election Monitoring Dashboard

**Path:** `/election-monitoring`

Overview of all election monitoring activities with key metrics and summaries.

### 7.2 Election News

**Path:** `/election-monitoring/news`

A curated feed of election-related news articles and updates.

### 7.3 Elections

**Path:** `/election-monitoring/elections`

Track specific elections — dates, types, regions, and statuses.

### 7.4 Political Parties

**Path:** `/election-monitoring/parties`

Database of registered political parties with profiles and activity tracking.

### 7.5 Politicians

**Path:** `/election-monitoring/politicians`

Profiles of politicians involved in monitored elections.

### 7.6 Actors & Non-Actors

**Path:** `/election-monitoring/actors`

Track key actors (and non-actors) influencing election outcomes and security.

### 7.7 Violence & Events

**Path:** `/election-monitoring/violence`

Monitor and log election-related violence incidents and significant events.

---

## 8. Risk Assessment

### 8.1 Risk Assessment

**Path:** `/analysis`

Comprehensive risk analysis tools:

- Regional risk scores
- Trend analysis over time
- Contributing factor breakdown
- Risk level classifications (Low, Medium, High, Critical)

### 8.2 Visualization

**Path:** `/visualization`

Advanced geographic and data visualization:

- Interactive map with incident overlays
- Multiple base map layers (satellite, street, topographic)
- GeoJSON boundary overlays
- Incident clustering and heatmaps
- Resource point visualization
- Add events directly on the map with coordinate capture

---

## 9. Response Management

### 9.1 Alerts

**Path:** `/alerts`

Manage system alerts generated from incidents:

- View active, acknowledged, and resolved alerts
- Filter by severity, region, and status
- Create new alerts manually
- Configure notification rules for automatic alert escalation

### 9.2 Incident Review

**Path:** `/incident-review`

Review incidents sourced from automated systems (social media ingestion, news feeds, etc.):

- **Accept** — approve and publish a sourced incident
- **Discard** — reject a sourced incident
- **Batch actions** — accept or discard multiple incidents at once
- View review statistics

### 9.3 Voice Incident Report

**Path:** `/voice-incident`

Manage voice-recorded incident reports:

- Listen to uploaded audio recordings
- View AI-generated transcriptions
- Re-transcribe recordings if needed
- Convert voice reports into formal incidents

### 9.4 Case Management

**Path:** `/case-management`

Track and manage incident cases through their lifecycle:

- Assign cases to team members
- Track case progress and status
- Add notes and attachments
- Manage case resolution

### 9.5 Response Plans

**Path:** `/response-plans`

Create and manage structured response plans:

- Define response strategies for different incident types
- Assign roles and responsibilities
- Set timelines and milestones
- Track plan execution

---

## 10. Communications

### 10.1 Chat

**Path:** `/chat`

Real-time team messaging:

- Send and receive messages with colleagues
- Share incident-related information quickly
- Group conversations for coordinated responses

### 10.2 Internal Email

**Path:** `/email`

Secure internal email system:

- Compose and send emails to team members
- Organize messages by folders
- Attach files and documents

### 10.3 Voice & Video Calls

**Path:** `/calls`

Make voice and video calls within the system:

- Initiate calls to team members
- Join calls via call ID at `/calls/join/:callId`
- Screen sharing and collaboration features

### 10.4 SMS Management

**Path:** `/sms`

Manage SMS communications for outreach and alerts:

- **Dashboard** (`/sms`) — overview of SMS activity
- **Compose SMS** (`/sms/compose`) — write and send new SMS messages
- **SMS Templates** (`/sms/templates`) — manage reusable message templates
- **Messaging Logs** (`/sms/logs`) — view sent/received message history

---

## 11. Social Media Monitoring

### 11.1 Social Dashboard

**Path:** `/social-media`

Aggregated view of social media monitoring across all platforms:

- Monitor mentions of conflict-related keywords
- Track trending topics related to peace and security
- Ingest social media posts as potential incidents

### 11.2 Platform-Specific Views

- **X (Twitter)** — `/social-media/twitter`
- **Facebook** — `/social-media/facebook`
- **Instagram** — `/social-media/instagram`
- **TikTok** — `/social-media/tiktok`

Each platform view provides filtered monitoring specific to that social network.

---

## 12. Administration

> **Note:** Administration pages are restricted to users with the **admin** role and security level 5 or higher.

### 12.1 Audit Logs

**Path:** `/audit-logs`

View a chronological record of all system activities:

- User login/logout events
- Data modifications
- Configuration changes
- Incident updates
- Filter by user, action type, and date range

### 12.2 Enterprise Settings

**Path:** `/enterprise-settings`

Configure system-wide settings:

- Organization profile
- Security policies
- Notification rules
- API integrations
- System preferences

### 12.3 User Management

**Path:** `/user-management`

Manage user accounts:

- **Create users** — add new team members with assigned roles
- **Edit users** — update profiles, roles, permissions, and security levels
- **Deactivate users** — disable accounts without deleting them
- **Assign departments and positions**

### 12.4 Integrations

**Path:** `/integrations`

Configure external service integrations:

- API key management
- Third-party service connections
- Webhook configurations
- Data source integrations

### 12.5 Reporting

**Path:** `/reporting`

Generate and export reports:

- Incident reports by region, date, and severity
- Trend analysis reports
- Performance metrics
- Export to various formats

### 12.6 Settings

**Path:** `/settings`

Personal account settings:

- **Profile** — update your display name, email, phone number
- **Preferences** — language, theme, data retention settings
- **Map Provider** — choose between Leaflet (OpenStreetMap), Google Maps, or Mapbox
- **Notifications** — configure how you receive alerts

---

## 13. User Roles and Permissions

The system supports five user roles with increasing levels of access:

| Role | Description | Typical Access |
|------|-------------|----------------|
| **user** | Basic user | View incidents, submit reports, access map |
| **analyst** | Data analyst | All user permissions + data analysis, AI tools, visualizations |
| **responder** | Field responder | All user permissions + case management, response plans, alerts |
| **manager** | Team manager | All responder permissions + team oversight, reporting |
| **admin** | System administrator | Full access including user management, audit logs, enterprise settings |

### Security Levels

Each user is assigned a **security level** from 1 (lowest) to 7 (highest). Certain features and data are restricted based on security level:

- **Level 1–2**: Basic access
- **Level 3–4**: Intermediate access with sensitive data visibility
- **Level 5–7**: Full administrative access including audit logs and enterprise settings

---

## 14. Language Support

EWERS supports four languages:

- **English** (default)
- **Igbo** (Igbo)
- **Hausa** (Hausa)
- **Yoruba** (Yoruba)

### Changing Language

**On the Home Page:** Use the language dropdown in the top-right header.

**Within the Application:** Go to **Settings** → update your language preference.

The interface text, navigation labels, and system messages will update to the selected language.

---

## 15. Troubleshooting

### Map Not Loading

- Ensure your browser allows loading external resources (tile servers)
- Try refreshing the page — the map may need a moment to initialize
- Switch between map layers using the layer control (top-right of map)
- Clear your browser cache if the map appears blank

### AI Recommendations Not Available

The message *"AI recommendations are not available at this time"* means the AI service is not configured on the server. Contact your system administrator to set up the `DEEPSEEK_API_KEY` or `OPENAI_API_KEY` environment variable.

### Login Issues

- Ensure your username is at least 3 characters and password at least 6 characters
- If you forgot your password, use the "Forgot Password" link on the login page
- Contact your administrator if your account has been deactivated

### Pages Not Loading / 401 Errors

- Your session may have expired — log out and log back in
- Ensure you have the correct role and security level for the page you're accessing
- Admin pages (Audit Logs, User Management, Enterprise Settings) require admin role with security level 5+

### Incident Data Not Appearing

- Check your internet connection — incident data is fetched from the server in real-time
- Verify filters are not hiding results — reset status and severity filters to "All"
- The system refreshes incident data every 10 seconds automatically

---

## Support

For technical support or to report issues:

- **Email:** info@ipcr.gov.ng
- **Address:** Plot 496 Abogo Largema Street, Central Business District, Abuja, Nigeria
- **Website:** [https://ipcr.gov.ng](https://ipcr.gov.ng)

---

*© 2026 Institute for Peace and Conflict Resolution. All rights reserved.*
*Designed by [afrinict.com](https://afrinict.com)*
