# TrackAudit — UI/UX Design PRD for Figma & Frontend Development

## Product Overview

TrackAudit is a modern B2B SaaS platform that audits Google Ads and conversion tracking health for PPC agencies, marketers, and in-house teams.

The product must feel:

* Premium
* Technical but approachable
* Data-driven
* Fast and trustworthy
* Modern SaaS aesthetic
* Built for agencies managing multiple client accounts

The UI should resemble a combination of:

* Linear
* Stripe Dashboard
* Vercel
* Datadog
* Sentry
* HubSpot

The application must support:

* Light mode
* Dark mode
* Responsive layouts
* Glassmorphism accents
* Gradient-based highlights
* Smooth animations
* Modern dashboard UI

---

# Global Design System

## Design Style

### Keywords

* Modern
* Colorful
* Premium SaaS
* Analytics-first
* Minimal clutter
* Sharp typography
* Smooth transitions
* High readability
* Executive dashboard aesthetic

---

# Color Palette

## Light Theme

### Primary Colors

* Primary Blue: #3B82F6
* Deep Navy: #0F172A
* Accent Purple: #8B5CF6
* Success Green: #10B981
* Warning Amber: #F59E0B
* Danger Red: #EF4444
* Cyan Accent: #06B6D4

### Backgrounds

* Main Background: #F8FAFC
* Card Background: #FFFFFF
* Sidebar Background: #FFFFFF
* Border: #E2E8F0

### Text

* Primary Text: #0F172A
* Secondary Text: #64748B
* Muted Text: #94A3B8

---

## Dark Theme

### Primary Colors

* Primary Blue: #60A5FA
* Accent Purple: #A78BFA
* Success Green: #34D399
* Warning Amber: #FBBF24
* Danger Red: #F87171

### Backgrounds

* Main Background: #020617
* Sidebar Background: #0F172A
* Card Background: #111827
* Elevated Card: #1E293B
* Border: #334155

### Text

* Primary Text: #F8FAFC
* Secondary Text: #CBD5E1
* Muted Text: #94A3B8

---

# Typography

## Fonts

* Primary Font: Inter
* Alternative Font: Geist

## Font Sizes

* Hero Heading: 56px
* Page Heading: 36px
* Section Heading: 24px
* Card Title: 18px
* Body Text: 16px
* Small Text: 14px
* Tiny Labels: 12px

---

# Layout Structure

## Desktop Layout

### Sidebar Width

* Expanded: 280px
* Collapsed: 90px

### Top Navigation Height

* 72px

### Main Content

* Max width: 1440px
* Padding: 32px

---

# Animation System

## Animations

* Hover lift on cards
* Smooth sidebar collapse
* Fade-in dashboard widgets
* Animated health score rings
* Progress bars with gradient animation
* Skeleton loading states

## Motion Guidelines

* Use Framer Motion
* 200–300ms transitions
* Spring easing for cards
* Soft hover shadows

---

# Core Components

## Buttons

### Primary Button

* Gradient blue-purple
* Rounded-xl
* Glow hover effect

### Secondary Button

* Transparent background
* Border-based
* Slight blur

### Danger Button

* Red background
* Used for disconnect/delete actions

---

# Navigation Structure

## Sidebar Navigation

### Items

* Dashboard
* Accounts
* Audits
* Reports
* Alerts
* Monitoring
* Billing
* White-label
* Integrations
* Settings

### Sidebar Features

* Collapsible
* Icons + labels
* Active state glow
* Workspace switcher
* Dark/light toggle
* User profile section

---

# ALL REQUIRED PAGES

---

# 1. Landing Page

## Purpose

Convert PPC agencies into trial users.

## Sections

### Hero Section

* Large headline
* Gradient background
* Animated dashboard preview
* CTA buttons
* Trust badges

### Hero Copy

"Detect broken Google Ads conversion tracking before it wastes your clients' ad spend."

### CTA Buttons

* Start Free Audit
* Book Demo

---

## Features Section

### Cards

* Conversion tracking audits
* Consent Mode monitoring
* Multi-account dashboards
* White-label reports
* Slack alerts
* CRM discrepancy checks

Use colorful floating cards.

---

## Social Proof Section

* Agency testimonials
* Health score screenshots
* Before vs after tracking examples

---

## Pricing Section

### Pricing Cards

* Starter
* Agency
* Agency Pro

Agency should be visually highlighted.

---

## FAQ Section

Accordion layout.

---

## Footer

* Docs
* Privacy
* Terms
* API
* Contact
* Social links

---

# 2. Login Page

## Layout

Split-screen design.

### Left Side

* Gradient illustration
* Product tagline
* Animated analytics dashboard

### Right Side

* Login form
* Email/password
* Google OAuth button
* Forgot password
* Signup link

---

# 3. Signup Page

## Features

* Agency-focused onboarding
* 14-day free trial banner
* Minimal form
* Password strength meter

---

# 4. Onboarding Wizard

## Step 1

Connect Google account.

### UI

* OAuth button
* Permission explanation
* Security reassurance

---

## Step 2

Select Google Ads accounts.

### UI

* Searchable account table
* MCC hierarchy view
* Multi-select checkboxes

---

## Step 3

Run first audit.

### UI

* Animated loading sequence
* Progress indicators
* Rotating audit tips

---

## Step 4

View first health report.

### UI

* Health score animation
* Critical findings cards
* Upgrade CTA

---

# 5. Main Dashboard

## Purpose

Central multi-account monitoring hub.

## Layout

### Top Bar

* Search
* Notifications
* Workspace switcher
* Theme toggle
* User profile

---

## Dashboard Widgets

### Health Summary Cards

* Total accounts
* Healthy accounts
* Critical alerts
* Average health score
* Conversion issues detected

Use colorful gradients.

---

## Main Analytics Grid

### Widget 1

Overall health score trend.

### Widget 2

Critical alerts list.

### Widget 3

Accounts requiring attention.

### Widget 4

Recent audit activity.

### Widget 5

Top failing checks.

### Widget 6

Estimated wasted spend.

---

## Dashboard Table

### Multi-account Table

Columns:

* Account name
* Health score
* Last audit
* Status
* Critical issues
* Actions

Include:

* Filters
* Sorting
* Search
* Pagination
* Bulk actions

---

# 6. Single Account Audit Page

## Purpose

Deep inspection of one account.

## Header

* Account name
* Health score ring
* Last audit timestamp
* Run audit button
* Export PDF

---

## Audit Overview Cards

* Pass count
* Warning count
* Failed checks
* Estimated wasted spend

---

## Audit Checks List

### Card Design

Each check should contain:

* Status icon
* Check name
* Severity badge
* Finding summary
* Expandable explanation
* Fix instructions
* View raw data

---

## Tabs

* Overview
* Failed Checks
* Warnings
* Recommendations
* Raw Data
* Timeline

---

# 7. Audit Running Page

## Purpose

Live audit execution experience.

## Features

* Animated progress bar
* Live logs
* Pulsing loaders
* Running checks list
* Completion estimate

### Example

"Validating Consent Mode signals..."

---

# 8. Reports Page

## Purpose

Manage downloadable audit reports.

## Features

* Report gallery
* Search
* Filter by account
* Download PDF
* Shareable link
* White-label preview

---

# 9. PDF Report Viewer

## Layout

Executive-style analytics report.

### Sections

* Cover page
* Executive summary
* Health score
* Failed checks
* Recommendations
* Historical trends
* Footer branding

Should feel investor-grade.

---

# 10. Alerts Center

## Purpose

Central monitoring inbox.

## Features

* Alert severity filters
* Snooze controls
* Resolve actions
* Slack sync status
* Timeline feed

---

# 11. Monitoring Page

## Features

* Scheduling controls
* Frequency selectors
* Active monitoring list
* Last run timestamps
* Failed schedules

---

# 12. Historical Analytics Page

## Charts

* Health score over time
* Conversion tracking stability
* Alert frequency
* Estimated ad spend loss
* Audit frequency

Use colorful charts with smooth animations.

---

# 13. White-label Settings Page

## Features

* Logo uploader
* Brand color pickers
* Agency name field
* PDF preview
* Shareable domain setup

---

# 14. Integrations Page

## Integration Cards

* Google Ads
* GA4
* Meta Ads
* HubSpot
* Salesforce
* Slack
* Stripe

Each card should show:

* Connected status
* Last sync
* Permissions
* Connect/disconnect button

---

# 15. Billing Page

## Features

* Current plan card
* Usage metrics
* Invoice history
* Upgrade CTA
* Subscription controls

Use premium SaaS pricing design.

---

# 16. Settings Page

## Sections

* Profile
* Security
* Notifications
* API keys
* Team members
* Timezone
* Theme preferences

---

# 17. Team Management Page

## Features

* Invite users
* Role assignment
* Permissions
* Activity logs
* Team audit history

---

# 18. Notification Preferences Page

## Features

* Email alerts toggle
* Slack alerts toggle
* Severity thresholds
* Daily digest settings
* Webhook configuration

---

# 19. API Documentation Page

## Features

* Endpoint explorer
* Copy code snippets
* Authentication guide
* SDK examples
* Usage analytics

Design should resemble Stripe docs.

---

# 20. 404 & Empty States

## Empty States

Use illustrations and onboarding guidance.

Examples:

* No connected accounts
* No audits yet
* No alerts
* No reports

---

# Design Components Library

## Reusable Components

### Cards

* MetricCard
* AlertCard
* AuditCheckCard
* PricingCard
* ReportCard

### Charts

* HealthTrendChart
* AlertFrequencyChart
* SpendLossChart
* AuditTimelineChart

### Inputs

* SearchInput
* ThemeToggle
* MultiSelectDropdown
* DateRangePicker
* SeverityFilter

### Status Components

* HealthScoreRing
* SeverityBadge
* StatusPill
* AnimatedProgressBar

---

# Dark Mode Requirements

## Must Support

* Instant theme switching
* Persist theme in local storage
* Smooth transition animation
* Separate chart themes
* Glow effects in dark mode

---

# Mobile Responsive Requirements

## Mobile Layout

* Collapsible sidebar drawer
* Bottom navigation for key pages
* Swipeable cards
* Responsive tables
* Mobile-first charts

---

# Accessibility Requirements

## Accessibility

* WCAG AA contrast
* Keyboard navigation
* Screen-reader labels
* Reduced motion support
* Focus states visible

---

# Recommended Figma Structure

## Figma Pages

1. Foundations
2. Components
3. Landing Pages
4. Authentication
5. Dashboard
6. Audit Pages
7. Reports
8. Settings
9. Mobile Designs
10. Dark Mode
11. Prototypes

---

# Recommended Frontend Stack

## Frontend

* React
* Vite
* Tailwind CSS
* Framer Motion
* Recharts
* Lucide Icons
* Zustand
* shadcn/ui

---

# Recommended UI Inspirations

## Inspiration References

* Linear
* Stripe Dashboard
* Vercel
* Datadog
* Sentry
* Notion
* Raycast
* Supabase

---

# Final Design Direction

TrackAudit should feel like:

* A premium developer tool
* Mixed with a modern analytics platform
* Built for agencies handling serious ad budgets
* Sophisticated enough for enterprise buyers
* Clean enough for freelancers
* Fast enough to feel real-time

The final experience should communicate:

* Trust
* Accuracy
* Monitoring
* Revenue protection
* Operational intelligence
* Modern AI-assisted analytics
