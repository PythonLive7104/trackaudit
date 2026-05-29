import { motion } from 'motion/react';
import {
  CheckCircle2, Shield, BarChart3, Zap, Bell, ClipboardCheck,
  ArrowRight, ChevronDown, AlertTriangle, TrendingUp, Building2,
  DollarSign, Star, Activity, FileText, Sliders, Play,
} from 'lucide-react';
import { Link } from 'react-router';
import { useState } from 'react';
import { SEO } from '../../components/SEO';
import { SITE_URL, SITE_NAME, OG_IMAGE } from '../../lib/seo';

// ── Structured data schemas ───────────────────────────────────────────────────

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/og-image.png`,
  sameAs: [],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    url: `${SITE_URL}/login`,
  },
};

const softwareApplicationSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: SITE_NAME,
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: SITE_URL,
  description:
    'Google Ads conversion tracking audit and monitoring platform for PPC agencies. Run 50+ automated checks on tags, consent mode, enhanced conversions, and data quality.',
  featureList: [
    'Conversion tracking audits',
    'Consent Mode V2 monitoring',
    'Multi-account dashboard',
    'White-label reports',
    'Real-time Slack alerts',
    'GA4 integration monitoring',
    'Smart bidding data checks',
    'Tag health monitoring',
  ],
  screenshot: OG_IMAGE,
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    reviewCount: '500',
    bestRating: '5',
  },
  offers: [
    {
      '@type': 'Offer',
      name: 'Starter',
      price: '49.00',
      priceCurrency: 'USD',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: '49.00',
        priceCurrency: 'USD',
        billingDuration: 'P1M',
      },
      description: 'Up to 3 Google Ads accounts. Daily automated audits, email alerts, basic reports.',
      url: `${SITE_URL}/signup`,
    },
    {
      '@type': 'Offer',
      name: 'Agency',
      price: '149.00',
      priceCurrency: 'USD',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: '149.00',
        priceCurrency: 'USD',
        billingDuration: 'P1M',
      },
      description: 'Up to 15 accounts. Real-time monitoring, Slack alerts, white-label reports, API access.',
      url: `${SITE_URL}/signup`,
    },
    {
      '@type': 'Offer',
      name: 'Agency Pro',
      price: '299.00',
      priceCurrency: 'USD',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: '299.00',
        priceCurrency: 'USD',
        billingDuration: 'P1M',
      },
      description: 'Unlimited accounts, priority support, custom branding, dedicated account manager.',
      url: `${SITE_URL}/signup`,
    },
  ],
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How does TrackAudit detect conversion tracking issues?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "TrackAudit runs automated checks on your Google Ads conversion tracking setup, including tag implementation, consent mode configuration, enhanced conversions, and data quality. We compare your setup against Google's best practices and alert you to any issues.",
      },
    },
    {
      '@type': 'Question',
      name: 'Can I use TrackAudit for multiple client accounts?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. TrackAudit is built specifically for agencies managing multiple client accounts. You can monitor all your clients from one dashboard and generate individual white-label reports for each client.',
      },
    },
    {
      '@type': 'Question',
      name: 'What happens during the 14-day free trial?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'You get full access to all Agency plan features for 14 days with no credit card required. Connect your Google Ads accounts, run audits, and see the value immediately. Cancel anytime.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does TrackAudit support platforms other than Google Ads?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Currently TrackAudit focuses on Google Ads and GA4. Support for Meta Ads, LinkedIn Ads, and other platforms is on the roadmap.',
      },
    },
    {
      '@type': 'Question',
      name: 'How does white-labeling work in TrackAudit?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Upload your agency logo, set your brand colors, and add your agency name. All reports carry your branding. Clients never see TrackAudit — they only see your agency.',
      },
    },
    {
      '@type': 'Question',
      name: 'What conversion tracking issues does TrackAudit check?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'TrackAudit checks for broken or missing conversion tags, duplicate conversion actions, incorrect conversion categories, missing auto-tagging, Consent Mode V2 non-compliance, missing enhanced conversions, GA4 integration gaps, smart bidding campaigns with insufficient conversion data, and conversion value tracking misconfiguration.',
      },
    },
  ],
};

const howToSchema = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to set up Google Ads conversion tracking audit with TrackAudit',
  description: 'Set up automated Google Ads conversion tracking monitoring in under 5 minutes.',
  totalTime: 'PT5M',
  tool: [{ '@type': 'HowToTool', name: 'Google Ads account' }],
  step: [
    {
      '@type': 'HowToStep',
      position: 1,
      name: 'Connect Your Accounts',
      text: 'Link your Google Ads accounts via OAuth in seconds. TrackAudit supports MCC hierarchies and unlimited multi-account setups.',
      url: `${SITE_URL}/signup`,
    },
    {
      '@type': 'HowToStep',
      position: 2,
      name: 'Audit Runs Automatically',
      text: 'TrackAudit checks 50+ tracking signals daily — tags, consent mode, enhanced conversions, and data quality — with no manual effort required.',
    },
    {
      '@type': 'HowToStep',
      position: 3,
      name: 'Fix Issues and Protect Ad Spend',
      text: 'Receive actionable fix steps, real-time alerts, and white-label client reports. Stop wasted ad spend before it starts.',
    },
  ],
};

const webSiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: SITE_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${SITE_URL}/signup`,
    },
    'query-input': 'required name=search_term_string',
  },
};

const LANDING_SCHEMAS = [organizationSchema, softwareApplicationSchema, faqSchema, howToSchema, webSiteSchema];

// ─────────────────────────────────────────────────────────────────────────────

export function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [billingAnnual, setBillingAnnual] = useState(false);

  const features = [
    {
      icon: ClipboardCheck,
      title: 'Conversion Tracking Audits',
      description: 'Run 50+ automated checks on tags, events, and data layers. Get step-by-step fix instructions for every issue found.',
      gradient: 'from-primary to-cyan',
    },
    {
      icon: Shield,
      title: 'Consent Mode V2 Monitoring',
      description: 'Stay compliant with Google Consent Mode V2. Monitor consent signals across all accounts and get alerted to violations instantly.',
      gradient: 'from-accent to-primary',
    },
    {
      icon: BarChart3,
      title: 'Multi-Account Dashboard',
      description: 'Monitor every client account from one hub. See health scores, active alerts, and audit history at a glance.',
      gradient: 'from-success to-cyan',
    },
    {
      icon: FileText,
      title: 'White-Label Reports',
      description: 'Generate branded PDF reports your clients will love. Upload your logo, set brand colors, and share via a branded link.',
      gradient: 'from-warning to-destructive',
    },
    {
      icon: Bell,
      title: 'Real-Time Slack Alerts',
      description: 'Get notified the moment tracking breaks. Route alerts by severity, account, or team member — no more manual checking.',
      gradient: 'from-destructive to-accent',
    },
    {
      icon: Sliders,
      title: 'CRM Discrepancy Detection',
      description: 'Compare Google Ads conversion data against HubSpot or Salesforce to surface invisible data gaps and attribution errors.',
      gradient: 'from-cyan to-success',
    },
  ];

  const steps = [
    {
      step: '01',
      title: 'Connect Your Accounts',
      description: 'Link Google Ads accounts via OAuth in seconds. Supports MCC hierarchies and unlimited multi-account setups.',
      icon: Zap,
      color: 'from-primary to-cyan',
    },
    {
      step: '02',
      title: 'Audit Runs Automatically',
      description: 'TrackAudit checks 50+ tracking signals daily — tags, consent mode, enhanced conversions, and data quality.',
      icon: Activity,
      color: 'from-accent to-primary',
    },
    {
      step: '03',
      title: 'Fix Issues & Protect Spend',
      description: 'Receive actionable fix steps, real-time alerts, and white-label client reports. Stop wasted spend before it starts.',
      icon: Shield,
      color: 'from-success to-cyan',
    },
  ];

  const testimonials = [
    {
      quote: 'TrackAudit caught a broken conversion tag costing our client $12K/month in wasted spend. It paid for itself on day one.',
      name: 'Sarah Mitchell',
      role: 'Head of Paid Media',
      company: 'Apex Digital',
    },
    {
      quote: 'The multi-account dashboard is a game-changer. I monitor 20 client accounts in 30 seconds instead of manually checking each one.',
      name: 'Marcus Chen',
      role: 'PPC Director',
      company: 'GrowthLabs',
    },
    {
      quote: 'White-label reports completely transformed how we present audit findings. Our clients love the professional presentation.',
      name: 'Emma Rodriguez',
      role: 'Agency Owner',
      company: 'Spark Media',
    },
  ];

  const pricingPlans = [
    {
      name: 'Starter',
      monthlyPrice: 49,
      annualPrice: 39,
      description: 'Perfect for freelancers',
      features: [
        'Up to 3 Google Ads accounts',
        'Daily automated audits',
        'Email alerts',
        'Basic reports',
        '30-day history',
      ],
      highlighted: false,
    },
    {
      name: 'Agency',
      monthlyPrice: 149,
      annualPrice: 119,
      description: 'Most popular for agencies',
      features: [
        'Up to 15 Google Ads accounts',
        'Real-time monitoring',
        'Slack & email alerts',
        'White-label reports',
        '90-day history',
        'Team collaboration',
        'API access',
      ],
      highlighted: true,
    },
    {
      name: 'Agency Pro',
      monthlyPrice: 299,
      annualPrice: 239,
      description: 'For enterprise agencies',
      features: [
        'Unlimited Google Ads accounts',
        'Real-time monitoring',
        'Priority support',
        'Custom branding',
        'Unlimited history',
        'Advanced integrations',
        'Dedicated account manager',
        'Custom SLA',
      ],
      highlighted: false,
    },
  ];

  const faqs = [
    {
      question: 'How does TrackAudit detect conversion tracking issues?',
      answer:
        "TrackAudit runs automated checks on your Google Ads conversion tracking setup, including tag implementation, consent mode configuration, enhanced conversions, and data quality. We compare your setup against Google's best practices and alert you to any issues.",
    },
    {
      question: 'Can I use this for multiple client accounts?',
      answer:
        'Yes! TrackAudit is built specifically for agencies managing multiple client accounts. You can monitor all your clients from one dashboard and generate individual white-label reports for each.',
    },
    {
      question: 'What happens during the 14-day free trial?',
      answer:
        'You get full access to all Agency plan features for 14 days with no credit card required. Connect your Google Ads accounts, run audits, and see the value immediately. Cancel anytime.',
    },
    {
      question: 'Do you support platforms other than Google Ads?',
      answer:
        'Currently we focus on Google Ads and GA4. Support for Meta Ads, LinkedIn Ads, and other platforms is on the roadmap.',
    },
    {
      question: 'How does white-labeling work?',
      answer:
        "Upload your agency logo, set your brand colors, and add your agency name. All reports carry your branding. Clients never see TrackAudit — they only see your agency.",
    },
  ];

  const stats = [
    { value: '500+', label: 'PPC Agencies' },
    { value: '50K+', label: 'Audits Completed' },
    { value: '$8.3M', label: 'Ad Spend Protected' },
    { value: '99.9%', label: 'Uptime SLA' },
  ];

  const mockMetrics = [
    { label: 'Accounts', value: '24', icon: Building2, color: 'from-primary to-cyan', change: '+3 this week' },
    { label: 'Health Score', value: '82', icon: TrendingUp, color: 'from-success to-cyan', change: '↑ 5 points' },
    { label: 'Critical Alerts', value: '3', icon: AlertTriangle, color: 'from-destructive to-warning', change: '-2 resolved' },
    { label: 'Wasted Spend', value: '$1.2K', icon: DollarSign, color: 'from-warning to-destructive', change: '-$400 saved' },
  ];

  const chartBars = [58, 63, 61, 68, 65, 72, 70, 76, 79, 75, 84, 88];
  const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

  return (
    <>
      <SEO
        title="TrackAudit — Google Ads Conversion Tracking Audit & Monitoring for Agencies"
        description="TrackAudit monitors your Google Ads conversion tracking 24/7. Catch broken tags, consent mode issues, and data gaps before they waste your clients' ad spend. Trusted by 500+ PPC agencies."
        canonical="https://trackaudit.io/"
        jsonLd={LANDING_SCHEMAS}
      />
    <div className="min-h-screen bg-background">

      {/* ── Navigation ─────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
              <ClipboardCheck className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground tracking-tight">TrackAudit</span>
          </div>

          <div className="hidden lg:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2">
              Login
            </Link>
            <Link
              to="/signup"
              className="px-4 py-2 bg-gradient-to-r from-primary to-accent text-white rounded-lg text-sm font-semibold hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-px transition-all duration-300"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-20 pb-0">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/8 rounded-full blur-3xl -translate-y-1/2 pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-accent/8 rounded-full blur-3xl -translate-y-1/3 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto mb-10 sm:mb-14"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6 sm:mb-8"
            >
              <Zap className="w-3.5 h-3.5" />
              Trusted by 500+ PPC agencies worldwide
            </motion.div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold text-foreground mb-4 sm:mb-6 leading-[1.1] tracking-tight">
              Stop losing money to{' '}
              <span className="bg-gradient-to-r from-primary via-accent to-cyan bg-clip-text text-transparent">
                broken conversion tracking
              </span>
            </h1>

            <p className="text-base sm:text-xl text-muted-foreground mb-7 sm:mb-10 leading-relaxed max-w-2xl mx-auto">
              TrackAudit monitors your Google Ads conversion tracking 24/7. Catch broken tags,
              consent issues, and data gaps before they waste your clients' ad spend.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
              <Link
                to="/signup"
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-primary to-accent text-white rounded-xl font-semibold text-lg hover:shadow-2xl hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2"
              >
                Start Free Audit
                <ArrowRight className="w-5 h-5" />
              </Link>
              <button className="w-full sm:w-auto px-8 py-4 bg-card border-2 border-border text-foreground rounded-xl font-semibold text-lg hover:border-primary/40 hover:bg-muted/50 transition-all duration-300 flex items-center justify-center gap-2">
                <Play className="w-4 h-4 fill-current" />
                Watch Demo
              </button>
            </div>
            <p className="text-sm text-muted-foreground">14-day free trial · No credit card required · Cancel anytime</p>
          </motion.div>

          {/* Mock dashboard preview */}
          <motion.div
            initial={{ opacity: 0, y: 48 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative max-w-5xl mx-auto"
          >
            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none" />

            <div className="rounded-2xl border border-border overflow-hidden shadow-2xl shadow-black/15">
              {/* Browser chrome */}
              <div className="bg-card border-b border-border px-4 py-3 flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-destructive/60" />
                  <div className="w-3 h-3 rounded-full bg-warning/60" />
                  <div className="w-3 h-3 rounded-full bg-success/60" />
                </div>
                <div className="flex-1 max-w-xs mx-auto bg-muted rounded-md h-6 flex items-center justify-center px-3">
                  <span className="text-xs text-muted-foreground">app.trackaudit.io/dashboard</span>
                </div>
              </div>

              <div className="bg-background p-3 sm:p-5">
                {/* Metric cards row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-3 sm:mb-4">
                  {mockMetrics.map((m, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.55 + i * 0.08 }}
                      className="bg-card rounded-xl p-3 sm:p-4 border border-border"
                    >
                      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br ${m.color} flex items-center justify-center mb-2 sm:mb-3`}>
                        <m.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                      </div>
                      <p className="text-[10px] sm:text-[11px] text-muted-foreground mb-0.5 truncate">{m.label}</p>
                      <p className="text-lg sm:text-2xl font-bold text-foreground leading-none mb-1">{m.value}</p>
                      <p className="text-[9px] sm:text-[10px] text-success truncate">{m.change}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Chart + alerts row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                  <div className="sm:col-span-2 bg-card rounded-xl p-3 sm:p-4 border border-border">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <p className="text-xs sm:text-sm font-semibold text-foreground">Health Score Trend</p>
                      <span className="text-[10px] sm:text-[11px] text-muted-foreground bg-muted px-2 py-1 rounded-md">Last 12 months</span>
                    </div>
                    <div className="flex items-end gap-1 sm:gap-1.5 h-16 sm:h-20">
                      {chartBars.map((h, i) => (
                        <motion.div
                          key={i}
                          initial={{ scaleY: 0 }}
                          animate={{ scaleY: 1 }}
                          transition={{ delay: 0.7 + i * 0.04, duration: 0.4, ease: 'easeOut' }}
                          style={{ height: `${h}%`, transformOrigin: 'bottom' }}
                          className="flex-1 bg-gradient-to-t from-primary/90 to-primary/30 rounded-sm"
                        />
                      ))}
                    </div>
                    <div className="flex mt-2">
                      {months.map((m, i) => (
                        <span key={i} className="flex-1 text-center text-[8px] sm:text-[9px] text-muted-foreground">{m}</span>
                      ))}
                    </div>
                  </div>

                  <div className="bg-card rounded-xl p-3 sm:p-4 border border-border">
                    <p className="text-xs sm:text-sm font-semibold text-foreground mb-2 sm:mb-3">Active Alerts</p>
                    <div className="space-y-2">
                      {[
                        { msg: 'Broken conversion tag', sev: 'Critical', cls: 'text-destructive bg-destructive/10' },
                        { msg: 'Consent mode gap', sev: 'Warning', cls: 'text-warning bg-warning/10' },
                        { msg: 'Enhanced conv. off', sev: 'Info', cls: 'text-primary bg-primary/10' },
                      ].map((alert, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap flex-shrink-0 ${alert.cls}`}>
                            {alert.sev}
                          </span>
                          <span className="text-[10px] sm:text-[11px] text-muted-foreground truncate">{alert.msg}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Stats Bar ──────────────────────────────────────────────── */}
      <section className="mt-10 sm:mt-16 py-10 sm:py-14 bg-muted/40 border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="text-center"
              >
                <p className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-1">
                  {stat.value}
                </p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────── */}
      <section id="features" className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-sm font-semibold text-primary mb-3 uppercase tracking-widest">Features</p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">Everything you need to protect ad spend</h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
              Comprehensive monitoring, alerting, and reporting — built for agencies who can't afford tracking errors.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="group bg-card p-8 rounded-2xl border border-border hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-sm font-semibold text-primary mb-3 uppercase tracking-widest">How It Works</p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">Set up in under 5 minutes</h2>
            <p className="text-lg text-muted-foreground">No code required. Connect, audit, protect.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative">
            <div className="hidden md:block absolute top-12 left-[calc(16.67%+3rem)] right-[calc(16.67%+3rem)] h-px bg-gradient-to-r from-primary/30 via-accent/30 to-success/30" />

            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="text-center relative"
              >
                <div className="relative inline-flex items-center justify-center mb-6">
                  <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-xl`}>
                    <step.icon className="w-10 h-10 text-white" />
                  </div>
                  <div className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-card border-2 border-primary flex items-center justify-center shadow-sm">
                    <span className="text-[10px] font-bold text-primary">{step.step}</span>
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ───────────────────────────────────────────── */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-sm font-semibold text-primary mb-3 uppercase tracking-widest">Testimonials</p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">Loved by agencies worldwide</h2>
            <p className="text-lg text-muted-foreground">Real results from real agencies protecting real budgets</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card rounded-2xl p-8 border border-border hover:border-primary/30 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                <div className="flex gap-0.5 mb-5">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-warning text-warning" />
                  ))}
                </div>
                <p className="text-muted-foreground leading-relaxed mb-6 text-sm">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role} · {t.company}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <p className="text-sm font-semibold text-primary mb-3 uppercase tracking-widest">Pricing</p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">Simple, transparent pricing</h2>
            <p className="text-lg text-muted-foreground mb-8">Choose the plan that fits your agency</p>

            <div className="inline-flex items-center bg-card border border-border rounded-xl p-1 gap-1">
              <button
                onClick={() => setBillingAnnual(false)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                  !billingAnnual ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingAnnual(true)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  billingAnnual ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Annual
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                  billingAnnual ? 'bg-white/20 text-white' : 'bg-success/15 text-success'
                }`}>
                  Save 20%
                </span>
              </button>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            {pricingPlans.map((plan, i) => {
              const price = billingAnnual ? plan.annualPrice : plan.monthlyPrice;
              const savings = (plan.monthlyPrice - plan.annualPrice) * 12;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={`rounded-2xl p-6 sm:p-8 relative ${
                    plan.highlighted
                      ? 'bg-gradient-to-br from-primary/10 to-accent/10 border-2 border-primary shadow-2xl shadow-primary/20 sm:scale-105'
                      : 'bg-card border border-border'
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
                      <div className="px-4 py-1.5 rounded-full bg-gradient-to-r from-primary to-accent text-white text-xs font-semibold shadow-lg">
                        Most Popular
                      </div>
                    </div>
                  )}
                  <h3 className="text-xl font-bold text-foreground mb-1">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-5">{plan.description}</p>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-4xl sm:text-5xl font-bold text-foreground">${price}</span>
                    <span className="text-muted-foreground text-sm">/mo</span>
                  </div>
                  {billingAnnual
                    ? <p className="text-xs text-success mb-5">Save ${savings}/year · billed ${price * 12} annually</p>
                    : <div className="mb-5" />
                  }
                  <Link
                    to="/signup"
                    className={`w-full py-3 rounded-xl font-semibold text-center block mb-7 text-sm transition-all duration-300 ${
                      plan.highlighted
                        ? 'bg-gradient-to-r from-primary to-accent text-white hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5'
                        : 'bg-muted text-foreground hover:bg-primary/10 hover:text-primary border border-border hover:border-primary/30'
                    }`}
                  >
                    Start Free Trial
                  </Link>
                  <ul className="space-y-3">
                    {plan.features.map((feat, j) => (
                      <li key={j} className="flex items-start gap-2.5 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ─────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-accent to-cyan px-6 py-12 sm:p-14 text-center text-white"
          >
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3 pointer-events-none" />
            <div className="relative">
              <p className="text-sm font-semibold uppercase tracking-widest opacity-75 mb-4">Get Started Today</p>
              <h2 className="text-2xl sm:text-4xl font-bold mb-4">Ready to protect your clients' ad spend?</h2>
              <p className="text-base sm:text-xl opacity-80 mb-8 sm:mb-10 max-w-xl mx-auto">
                Join 500+ agencies who trust TrackAudit to catch tracking errors before they waste money.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/signup"
                  className="px-8 py-4 bg-white text-primary rounded-xl font-semibold text-lg hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2"
                >
                  Start Free Audit
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <button className="px-8 py-4 border-2 border-white/40 text-white rounded-xl font-semibold text-lg hover:bg-white/10 transition-all duration-300">
                  Book a Demo
                </button>
              </div>
              <p className="text-sm opacity-60 mt-6">14-day free trial · No credit card required · Cancel anytime</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────── */}
      <section id="faq" className="py-24 bg-muted/30">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-sm font-semibold text-primary mb-3 uppercase tracking-widest">FAQ</p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">Frequently asked questions</h2>
            <p className="text-lg text-muted-foreground">Everything you need to know about TrackAudit</p>
          </motion.div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="bg-card rounded-xl border border-border overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-muted/50 transition-colors"
                >
                  <span className="font-semibold text-foreground pr-8 text-sm">{faq.question}</span>
                  <motion.div
                    animate={{ rotate: openFaq === i ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex-shrink-0"
                  >
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  </motion.div>
                </button>
                <motion.div
                  initial={false}
                  animate={{ height: openFaq === i ? 'auto' : 0, opacity: openFaq === i ? 1 : 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <p className="px-6 pb-5 text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="bg-card border-t border-border py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
            <div className="col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <ClipboardCheck className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-foreground">TrackAudit</span>
              </div>
              <p className="text-sm text-muted-foreground mb-5 max-w-xs leading-relaxed">
                Protecting agency clients' ad spend through automated conversion tracking audits.
              </p>
              <div className="flex gap-2">
                {['T', 'in', 'gh'].map((s) => (
                  <a key={s} href="#" className="w-8 h-8 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary flex items-center justify-center text-xs font-semibold text-muted-foreground transition-colors">
                    {s}
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">Product</h4>
              <ul className="space-y-2.5">
                {['Features', 'Pricing', 'API Docs', 'Changelog'].map((l) => (
                  <li key={l}><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">Company</h4>
              <ul className="space-y-2.5">
                {['About', 'Blog', 'Contact', 'Privacy', 'Terms'].map((l) => (
                  <li key={l}><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">Resources</h4>
              <ul className="space-y-2.5">
                {['Documentation', 'Status Page', 'Roadmap', 'Support'].map((l) => (
                  <li key={l}><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">© 2026 TrackAudit. All rights reserved.</p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              All systems operational
            </div>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}
