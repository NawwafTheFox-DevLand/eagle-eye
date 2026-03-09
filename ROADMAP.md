# عين النسر — Eagle Eye
## Mansour Holding — Project Roadmap & Architecture Blueprint
### Version 1.0 | March 2026 | Confidential

---

## Executive Summary

Eagle Eye (عين النسر) is a production-grade internal workflow and request management platform built for Mansour Holding. It centralizes all internal requests across the holding company and its subsidiaries, enforces structured approval workflows, tracks performance via KPIs, and includes a specialized Government Relations (GR) module with 8 distinct procedure types.

**Tech Stack:** Next.js 15 + Supabase (Postgres + Auth + Storage) + Vercel + GitHub

**Supabase Project:** `jwhscbyyvzmyjunmmxnr.supabase.co`

---

## Organizational Structure (from Master Data)

### Holding Company
- **MH / H1** — منصور القابضة (Mansour Holding) — Parent entity

### Subsidiary Companies
| Code | Arabic Name | English Name | Sector |
|------|------------|--------------|--------|
| G1 | منصور للذهب | Mansour Gold | قطاع الذهب |
| G2 | مصنع الجودة الوطنية | National Quality Factory | قطاع الذهب |
| G3 | موطن الذهب | Gold Home | قطاع الذهب |
| T1 | شركة ام بي جي | MBG Trading | القطاع التجاري |
| R1 | شركة الأوتاد | Al-Awtad | قطاع العقار |
| R2 | شركة اسكان الدولية | International Housing | قطاع العقار |
| M1 | شركة التكنولوجيا | Multi-Technology | قطاع التصنيع |

### Departments (Holding Level)
| Code | Arabic Name | Sector |
|------|------------|--------|
| FIN10 | المالية | القطاع المالي |
| HR10 | الموارد البشرية | الخدمات المساندة |
| IT10 | تقنية المعلومات | الخدمات المساندة |
| LG10 | الإدارة القانونية | الخدمات المساندة |
| AD10 | المراجعة الداخلية | المراجعة الداخلية |
| PC10 | المشتريات | الخدمات المساندة |
| GR10 | العلاقات الحكومية | الخدمات المساندة |
| Z99 | خدمات رئيس مجلس الإدارة | الخدمات والإعاشة |

---

## Database Schema Overview

### Migration 001: Core Schema (Organizations & People)
**Tables:** companies, sectors, departments, positions, locations, sub_locations, employees, user_roles, delegations, audit_log

Key design decisions:
- UUID primary keys throughout for security
- Row Level Security (RLS) on every table
- Holding CEO has hidden visibility across all companies
- Deferred foreign keys for circular references (company ↔ employee)
- Audit log captures all master data changes
- Helper functions: `current_employee_id()`, `has_role()`, `is_holding_ceo()`, `is_super_admin()`

### Migration 002: Request System (Workflows & Approvals)
**Tables:** request_type_configs, requests, approval_steps, request_actions, evidence, notifications, sla_configs, automation_rules

Key design decisions:
- Request numbering: `{COMPANY}-{DEPT}-{TYPE}-{YEAR}-{SEQUENCE}` (e.g., MH-FIN10-FIN-2026-000001)
- 11 request statuses with full lifecycle tracking
- 10 request types with configurable forms (via JSONB form_schema)
- SLA auto-set on submission with breach tracking
- Evidence versioning with immutable audit trail
- Confidentiality levels: normal, confidential, restricted
- Financial requests always route to Holding Finance + CEO
- E-signature support: internal acknowledgment, workflow approval, legally binding

### Migration 003: Government Relations Module
**Tables:** gr_entities, gr_licenses, gr_scales, gr_trademarks, gr_tasks, gr_task_steps, gr_violations, gr_workshops, gr_committees, gr_alerts

8 Procedure Types:
1. Annual Renewal & Confirmation (التأكيد السنوي والتجديد)
2. Issuance & Modification (الإصدار والتعديل)
3. Cancellation & Transfer (الشطب ونقل الملكية)
4. Government Inquiries (الاستعلامات)
5. Violations Management (المخالفات) — 3 resolution paths
6. Workshops & Training (ورش العمل)
7. Investigations (التحقيقات)
8. Branch Committees (لجان الافتتاح والإغلاق)

Key features:
- 4 business groups with 20+ legal entities
- License expiry tracking with auto-alerts at 90/60/30/7/0 days
- 37-field violations tracking model
- Committee management with multi-member task assignment
- GR QR code/link for department inquiries
- Daily cron for license and violation deadline monitoring

---

## Role Matrix

| Role | Scope | Key Permissions |
|------|-------|----------------|
| Super Admin | Platform | Global config, company creation, all data access |
| Company Admin | Company | Departments, users, company settings |
| CEO (Holding) | All companies | Hidden visibility, financial approvals, escalations |
| CEO (Company) | Company | Company dashboard, approvals, KPIs |
| Department Manager | Department | Team requests, approvals, delegation |
| Employee | Self | Create requests, track own, respond to clarifications |
| Finance Approver | Holding | Budget/disbursement review |
| HR Approver | Holding | Leave, promotion, demotion review |
| GR Manager | GR Dept | All GR procedures, violation paths, committees |
| GR Employee | GR Dept | GR tasks, license tracking, data entry |
| Audit Reviewer | Read-only | Compliance review, no workflow changes |
| Delegated Approver | Temporary | Act for absent approver within date range |

---

## Phase Breakdown & Milestones

### Phase 0: Foundation Setup ✅ (This Delivery)
**Duration:** Immediate | **Status:** Complete

Deliverables:
- Complete database schema (3 migrations, 30+ tables)
- Next.js 15 project structure with TypeScript
- Supabase integration (Auth, Database, Storage)
- Professional Eagle Eye logo and branding
- Tailwind CSS design system with custom theme
- Login page (bilingual AR/EN)
- Dashboard layout (sidebar, topbar, navigation)
- Row Level Security policies
- Role-based navigation
- Project roadmap and documentation

---

### Phase 1: Core Workflow MVP
**Duration:** 3-4 weeks | **Priority:** Critical

#### Sprint 1.1 (Week 1-2): Data Foundation
- [ ] Run migrations on Supabase
- [ ] Build master data import script (from Excel)
- [ ] Create all auth users from employee emails
- [ ] Seed companies, departments, positions, employees
- [ ] Implement auth flow (login, logout, session)
- [ ] Build employee profile page
- [ ] Test RLS policies

#### Sprint 1.2 (Week 2-3): Request Engine
- [ ] Request creation form (general internal)
- [ ] Dynamic form rendering from `form_schema`
- [ ] Request number generation
- [ ] Approval chain builder (auto-generate from rules)
- [ ] Request detail page with timeline
- [ ] Request list with filters
- [ ] Evidence upload (Supabase Storage)

#### Sprint 1.3 (Week 3-4): Workflow Actions
- [ ] Approve/reject actions with mandatory rationale
- [ ] Send-back for clarification
- [ ] Resubmission without history loss
- [ ] Status transitions and validation
- [ ] In-app notifications (create + mark read)
- [ ] Email notifications (Supabase edge function)
- [ ] Basic SLA tracking

**Milestone M1:** Core request flow working end-to-end

---

### Phase 2: Advanced Features
**Duration:** 3-4 weeks | **Priority:** High

#### Sprint 2.1 (Week 5-6): Specialized Forms
- [ ] Fund Disbursement form (amount, currency, payee, cost center)
- [ ] Leave Approval form (type, dates, replacement)
- [ ] Promotion form (current/proposed role, compensation)
- [ ] Demotion/Disciplinary form (restricted visibility)
- [ ] Intercompany request form
- [ ] Cross-department request form
- [ ] Create Department/Company/Position forms

#### Sprint 2.2 (Week 7-8): Workflow Intelligence
- [ ] Delegation matrix (out-of-office)
- [ ] SLA engine with escalation
- [ ] Parallel and sequential approval support
- [ ] Financial request auto-routing to Holding Finance + CEO
- [ ] HR request auto-routing to Holding HR
- [ ] Routine request automation rules
- [ ] Self-approval prevention

#### Sprint 2.3 (Week 8-9): Security & Audit
- [ ] E-signature capture (canvas-based)
- [ ] Confidentiality enforcement
- [ ] Complete audit trail
- [ ] Break-glass access logging
- [ ] Admin panel: employees, departments, positions
- [ ] Master data change history

**Milestone M2:** All request types and advanced workflows operational

---

### Phase 3: Dashboards & Analytics
**Duration:** 2-3 weeks | **Priority:** High

#### Sprint 3.1 (Week 10-11): Executive Dashboards
- [ ] CEO dashboard (company-wide KPIs)
- [ ] Department manager dashboard
- [ ] Employee performance KPIs (visible to dept head + CEO)
- [ ] Total cycle time metrics
- [ ] Stage duration analysis
- [ ] Overdue items tracker
- [ ] Approval/rejection rates
- [ ] SLA breach rate

#### Sprint 3.2 (Week 11-12): Search & Reports
- [ ] Advanced search (request number, type, requester, status, date, amount)
- [ ] Saved views/dashboards
- [ ] Excel/PDF export
- [ ] Financial exposure reporting
- [ ] Evidence completeness audit
- [ ] Automation rate tracking

**Milestone M3:** Full analytics and reporting operational

---

### Phase 4: Government Relations Module
**Duration:** 4-5 weeks | **Priority:** High

#### Sprint 4.1 (Week 13-14): Entity & License Foundation
- [ ] GR entities CRUD + detail page
- [ ] License registry with traffic-light expiry
- [ ] Scale (taqees) management
- [ ] Trademark tracking
- [ ] Entity seed data for all 4 groups
- [ ] License expiry cron job

#### Sprint 4.2 (Week 15-16): Core GR Procedures
- [ ] Annual Renewal workflow (Procedure 1)
- [ ] Issuance & Modification workflow (Procedure 2)
- [ ] Auto-alert system (90/60/30/7 days)
- [ ] Renewal task auto-creation at 30 days
- [ ] Finance/Banking payment steps integration

#### Sprint 4.3 (Week 17-18): Advanced GR Procedures
- [ ] Cancellation/Transfer with HR clearance bridge (Procedure 3)
- [ ] Government Inquiries with QR code/link (Procedure 4)
- [ ] Violations Management — all 3 paths (Procedure 5)
- [ ] 37-field violation tracking form
- [ ] Violation deadline alerts

#### Sprint 4.4 (Week 19-20): Specialized GR Features
- [ ] Workshops & Training (Procedure 6)
- [ ] Investigations with committee management (Procedure 7)
- [ ] Branch Opening/Closing Committees (Procedure 8)
- [ ] GR Performance Dashboard
- [ ] On-time KPIs by employee/procedure/entity

**Milestone M4:** Complete GR module with all 8 procedures

---

### Phase 5: Hardening & Pilot
**Duration:** 3-4 weeks | **Priority:** Critical

#### Sprint 5.1 (Week 21-22): Production Hardening
- [ ] Security audit and penetration testing
- [ ] Performance optimization
- [ ] Error monitoring (Sentry/Vercel)
- [ ] Backup and recovery testing
- [ ] MFA for privileged roles
- [ ] Rate limiting and input validation

#### Sprint 5.2 (Week 23-24): Pilot & Rollout
- [ ] Pilot with 2 entities
- [ ] User training materials (AR/EN)
- [ ] SOPs for each request type
- [ ] UAT testing with real users
- [ ] Bug fixes and refinements
- [ ] Production deployment
- [ ] Go-live checklist

**Milestone M5:** Production launch approved

---

## Technical Architecture

```
┌─────────────────────────────────────────────────┐
│                   Vercel CDN                     │
│              (Next.js 15 + React 19)             │
├─────────────────────────────────────────────────┤
│  Login │ Dashboard │ Requests │ GR │ Admin │ API │
├─────────────────────────────────────────────────┤
│            Middleware (Auth Guard)                │
├─────────────────────────────────────────────────┤
│  Server Actions │ API Routes │ Edge Functions    │
├─────────────────────────────────────────────────┤
│              Supabase Client (SSR)               │
├──────────────┬──────────────┬───────────────────┤
│  Supabase    │  Supabase    │  Supabase          │
│  Auth        │  Database    │  Storage           │
│  (Users/MFA) │  (Postgres)  │  (Files/Evidence)  │
│              │  + RLS       │                    │
│              │  + Functions │                    │
│              │  + Triggers  │                    │
└──────────────┴──────────────┴───────────────────┘
```

---

## Non-Functional Requirements

| Requirement | Target |
|------------|--------|
| Availability | 99.5% uptime during business hours |
| Page Load | < 2 seconds for common pages |
| Search | < 500ms response time |
| Language | Full Arabic + English support (RTL/LTR) |
| Responsive | Desktop-first, usable on tablet/mobile |
| Retention | 10 years for completed requests |
| Encryption | TLS in transit, AES-256 at rest |
| Backup | Daily automated backups |
| SLA Clock | Always ticking (calendar + working time displayed) |

---

## Files Delivered (Phase 0)

```
eagle-eye/
├── .env.local                          # Supabase credentials
├── .gitignore
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── postcss.config.mjs
├── public/
│   └── logo.svg                        # Professional Eagle Eye logo
├── supabase/
│   ├── migrations/
│   │   ├── 001_core_schema.sql         # Organizations & People (16 tables)
│   │   ├── 002_request_system.sql      # Workflows & Approvals (8 tables)
│   │   └── 003_gr_module.sql           # Government Relations (10 tables)
│   └── seed/
│       └── 002_request_configs.sql     # Request type configurations
└── src/
    ├── middleware.ts                    # Auth guard
    ├── app/
    │   ├── layout.tsx                  # Root layout with fonts
    │   ├── globals.css                 # Design system + custom classes
    │   ├── page.tsx                    # Root redirect
    │   ├── login/page.tsx              # Bilingual login page
    │   ├── api/auth/login/route.ts     # Auth API
    │   └── dashboard/
    │       ├── layout.tsx              # Dashboard chrome
    │       └── page.tsx                # Main dashboard with KPIs
    ├── components/
    │   └── layout/
    │       ├── Sidebar.tsx             # Navigation with role-based sections
    │       └── TopBar.tsx              # Search, notifications, profile
    ├── lib/
    │   ├── supabase/
    │   │   ├── server.ts               # Server + Service client
    │   │   ├── client.ts               # Browser client
    │   │   └── session.ts              # Session helper
    │   └── utils/
    │       └── index.ts                # cn, formatters, status colors
    └── types/                          # (TypeScript types)
```

**Total: 34 new database tables | 15 source files | 3 SQL migrations | Production-grade foundation**

---

*Eagle Eye عين النسر — Mansour Holding — Confidential*
