# Remix of Remix of Remix of Ticket Master Suite

📑 وثيقة متطلبات المنتج (PRD) - TICKETTY ERP

الإصدار: 5.0 (النسخة المعمارية النهائية - B2B SaaS) التاريخ: يوليو 2026 المنصة المستهدفة: بيئات Vibe Coding (Node.js/React)

1. ملخص تنفيذي ورؤية المنتج (Executive Summary)

TICKETTY ERP هو نظام تخطيط موارد المؤسسات (SaaS ERP) متعدد المستأجرين (Multi-Tenant)، مُصمم خصيصاً لوكالات السفر البري وشركات الباصات. النظام ينتقل من كونه تطبيق حجز بسيط للمستهلك (B2C) ليصبح العمود الفقري التشغيلي والمالي (B2B) للوكالات. يهدف النظام إلى القضاء على الحجوزات المزدوجة، أتمتة الدورة المحاسبية للورديات، إدارة المديونيات المعقدة للسماسرة، وتوفير أدوات تسعير ديناميكية لتعظيم الإيرادات.

2. المكدس التقني والبنية التحتية (Tech Stack & Architecture)

بناءً على التوافق مع بيئات التطوير السحابية الحديثة، تم اعتماد المكدس التالي:

الواجهة الأمامية (Frontend): React / Next.js، مبنية كـ PWA (Progressive Web App) لضمان استمرار العمل دون اتصال (Offline-first) للمفتشين والكاشيرية، وهو أمر بالغ الأهمية لعملياتنا في مناطق مثل محطات بورتسودان والمسارات السريعة التي تعاني من تذبذب الشبكة.

الواجهة الخلفية (Backend): TypeScript + Express API.

قاعدة البيانات (Database): PostgreSQL باستخدام Drizzle ORM.

الذاكرة المؤقتة (Cache/Locks): Redis (لإدارة قفل المقاعد اللحظي).

الأمان: JWT Authentication مع تطبيق صارم لعزل المستأجرين (Tenant Isolation).

3. المستخدمون المستهدفون (User Personas)

Super Admin (المالك): يدير منصة TICKETTY، يضيف الشركات، ويدير الاشتراكات.

Company Owner (مالك الوكالة): يمتلك حق الوصول إلى لوحات القيادة، التقارير المالية لجميع الفروع، ودفتر الأستاذ.

Branch Manager (مدير الفرع): يراقب ورديات الكاشيرية، يعتمد تسويات السماسرة، ويدير الحركة في فرعه.

Booking Officer / Cashier (موظف الحجز): يصدر التذاكر، يفتح ويغلق الورديات المالية (يستخدم واجهة كثيفة البيانات تدعم اختصارات الكيبورد).

Inspector (المفتش): يستخدم تطبيق الـ PWA لمسح رموز QR للتذاكر عند باب الباص.

Broker (السمسار): يمتلك واجهة محدودة (Broker Portal) لإصدار التذاكر بحدود ائتمانية وعمولات محددة.

4. الوحدات الأساسية (Core Modules)

الوحدة الأولى: التنظيم والهوية (Organization & IAM)

المتطلبات: بناء هيكل من 4 مستويات (Tenant ➔ Branch ➔ Station ➔ POS).

الأمان: نظام RBAC صارم. يجب أن يحمل كل جدول (باستثناء tenants) حقل tenant_id. موظفو الفروع يتم ربطهم بفروعهم عبر جداول وسيطة للتعامل مع "الموظف المتنقل".

الوحدة الثانية: إدارة الأسطول والرحلات (Fleet & Trips)

المتطلبات: إدارة الباصات، سعتها، وأنواع المقاعد (Layouts).

الخطوط الذكية (Smart Routes): الخطوط ليست (من-إلى) فقط، بل تتكون من محطات متسلسلة (Waypoints) للسماح ببيع القطاعات المجزأة.

الرحلات: توليد المقاعد آلياً في قاعدة البيانات بمجرد جدولة الرحلة.

الوحدة الثالثة: محرك الحجز ودورة حياة التذكرة (Booking & Ticketing)

الفرق بين الحجز والتذكرة: الحجز (PNR) هو حجز مقعد، التذكرة هي وثيقة مالية تصدر فقط عند الدفع.

المحرك الذكي (Smart Seat Engine): استخدام Redis Distributed Locks لمنع الحجز المزدوج. المقعد يمر بحالات: (Available ➔ Locked ➔ Sold ➔ Checked_In).

التذاكر الآمنة: توليد رمز QR مشفر (HMAC) يحتوي على بيانات الرحلة والتذكرة لمنع التزوير.

المنفستو الآلي: إغلاق الرحلة يولد ملف PDF نهائي وغير قابل للتعديل لأسماء الركاب.

الوحدة الرابعة: الصندوق والورديات (Shifts & Cash Flow)

المتطلبات: منع أي عملية مالية خارج "الوردية" (Shift).

التسوية (Reconciliation): يطابق النظام "النقد المتوقع" مع "النقد الفعلي" الذي يدخله الكاشير عند الإغلاق. الفروقات تُقفل كـ (Discrepancy) وترسل لمدير الفرع.

الوحدة الخامسة: إدارة السماسرة (Broker Management)

المتطلبات: محفظة مالية لكل سمسار (Wallet) بحد ائتماني (Credit Limit).

العمليات الآلية: قيد آلي يخصم قيمة التذكرة ويضيف العمولة للمحفظة فور الإصدار. التجاوز للحد الائتماني يوقف حساب السمسار آلياً.

الوحدة السادسة: المحاسبة العامة (Double-Entry Ledger)

المتطلبات: شجرة حسابات (Chart of Accounts) لدعم مراكز التكلفة (الفروع).

القيود الآلية: كل عملية (بيع، عمولة، استرجاع) تولد قيداً يومياً مزدوجاً (Journal Entry) متزناً (مدين = دائن) في الخلفية لضمان سلامة ميزان المراجعة.

الوحدة السابعة: التسعير الديناميكي (Yield Management)

المتطلبات: تسعيرة مبنية على القطاعات (Segment Pricing).

المضاعفات (Multipliers): تطبيق قواعد زيادة الأسعار آلياً في مواسم الأعياد وفترات الذروة.

5. قواعد العمل الصارمة (Strict Business Rules)

العزل التام (Zero Data Leakage): يُمنع منعاً باتاً استعلام أي بيانات بدون تمرير tenant_id الخاص بالـ Session الحالي.

ACID Transactions: أي عملية تتضمن مقاعد وأموال يجب أن تغلف بـ Database Transactions. الفشل في أي جزء يلغي العملية بأكملها.

Append-Only Ledger: السجلات المالية (محافظ السماسرة والقيود اليومية) غير قابلة للتعديل أو الحذف (UPDATE / DELETE Forbidden). الأخطاء تُعالج بقيود عكسية.

No Shift, No Sale: لا تذكرة تُطبع بدون وردية (Shift) مرتبطة بنقطة بيع (POS) نشطة.

6. المتطلبات غير الوظيفية (Non-Functional Requirements)

زمن الاستجابة: إتمام عملية قفل المقعد في Redis في أقل من 50 مللي ثانية.

العمل دون اتصال: تطبيق المفتش (PWA) يجب أن يخزن الـ Keys الخاصة بفك تشفير التذاكر محلياً، لمسح الـ QR للركاب وتحديث حالة الصعود، ثم مزامنة البيانات (Sync) عند توفر الإنترنت.

لوحات القيادة (CQRS): تعتمد التقارير على جداول مجمعة (Materialized Views) لعدم إرهاق جداول العمليات (Transactional DB) أثناء فترات الذروة.
# برومبت جاهز — TICKETTY ERP (نظام إدارة شركات النقل البري)

انسخ ما بين السطور التالية وسلّمه للأداة الأخرى كما هو.

---

## 1. هوية المشروع

اسم المنتج: **TICKETTY ERP**
النوع: **تطبيق ويب (Web App / SaaS Dashboard)** — ليس تطبيق جوال، وليس واجهة مسافر.
الجمهور: **مالكو ومشغّلو شركات ووكالات النقل البري في السودان والمنطقة العربية** (كاشير، محاسب، مشرف، مفتش، سمسار، مدير).
اللغة الأساسية: **العربية** مع اتجاه **RTL** كامل. دعم إنجليزي ثانوي اختياري.
الأولوية: **سطح المكتب والتابلت** (شاشات كاشير ومكاتب)، مع بقاء التخطيط مرنًا على الجوال للمشرفين والمفتشين في الميدان.

---

## 2. المشكلة التي يحلها

معظم الوكالات اليوم تعمل بدفتر ورقي + Excel + WhatsApp + سماسرة + تذاكر ورقية، مما يسبب:
- بيع نفس المقعد لشخصين
- فقدان بيانات الركاب
- أخطاء المنفستو
- عدم معرفة المقاعد المتبقية لحظيًا
- سرقة أموال وغياب المساءلة
- انعدام التقارير والإيرادات الحقيقية
- عدم معرفة من أصدر أي تذكرة

TICKETTY ERP يحلّ ذلك عبر **محرك حجوزات مركزي واحد** تمر عبره كل قنوات البيع (كاشير المكتب، السمسار، الموقع، تطبيق المسافر لاحقًا).

---

## 3. الوحدات المطلوبة (Modules)

نظّم القائمة الجانبية على شكل **مجموعات ERP** بهذا الترتيب من الأعلى للأسفل:

### أ) الرئيسية
- **Overview / نظرة عامة**: بطاقات KPI (إيرادات اليوم، الأسبوع، الشهر — حجوزات اليوم — نسبة الإشغال — الرحلات النشطة — الحافلات في الصيانة — الموظفون على الوردية) + آخر 10 حجوزات + تنبيهات + رسم بياني للإيرادات آخر 30 يومًا.

### ب) الحجوزات والرحلات
- **Seat Engine / محرك المقاعد**: مخطط مقاعد الحافلة تفاعلي (grid)، حالات المقعد (متاح، محجوز، مدفوع، مؤقّت-محجوز-15د، محظور، مقعد سائق). قفل مقعد لحظة اختيار الكاشير له حتى إتمام العملية، مع timer.
- **Cashier / نقطة البيع (POS)**: شاشة مبسّطة لإصدار تذكرة في أقل من 20 ثانية — اختيار الرحلة، المقعد، اسم المسافر ورقمه، طريقة الدفع (نقدي/تحويل بنكي/محفظة)، طباعة تذكرة PDF.
- **Bookings / الحجوزات**: جدول بكل الحجوزات مع فلاتر (تاريخ، رحلة، كاشير، حالة، طريقة دفع)، تعديل، إلغاء، استرجاع، سجل تدقيق.
- **Trips & Offers / الرحلات والعروض**: قائمة رحلات بها (المدينة من/إلى، وقت المغادرة، السعر، الحافلة، السائق، حالة الرحلة، صورة مصغرة، وصف). زر "نشر كعرض" ليظهر للمسافرين.
- **Manifest / المنفستو الرقمي**: كشف ركاب رحلة معينة قابل للطباعة والتصدير (PDF/Excel) — يظهر رقم المقعد، اسم الراكب، هاتفه، من أصدر التذكرة، طريقة الدفع، ملاحظات.

### ج) الأسطول والعمليات
- **Buses / الحافلات**: CRUD مع (رقم اللوحة، النوع مكيف/عادي/VIP، عدد المقاعد، مخطط المقاعد المخصّص، صورة الحافلة، حالة نشطة/صيانة، ملاحظات).
- **Routes / المسارات**: CRUD مع (من، إلى، سعر أساسي، مدة، جدولة أيام الأسبوع، حالة نشط).
- **Drivers / السائقون**: CRUD مع (الاسم، الهاتف، الرخصة، الحافلة المرتبطة، حالة على وردية/في إجازة).
- **Inspector / المفتش**: شاشة مسح QR لتذكرة الراكب عند صعود الحافلة، تسجيل الحاضر/الغائب، مطابقة المنفستو.

### د) الإدارة والمالية
- **Employees & Roles / الموظفون والصلاحيات**: CRUD موظفين بأدوار: `agency_owner`, `manager`, `cashier`, `broker` (سمسار), `accountant`, `supervisor`, `inspector`. صلاحيات تعتمد على الدور.
- **Broker / السماسرة**: عمولات، حساب تلقائي لكل تذكرة يبيعها، تسوية دورية.
- **Accountant / المحاسبة**: قيود يومية، الإيرادات، المصروفات، صندوق النقدية، مطابقة حسابات الكاشيرين نهاية اليوم.
- **Reports / التقارير**: إيراد يومي/أسبوعي/شهري، أداء كل كاشير، أداء كل رحلة، أعلى المسارات، إشغال متوسط، مقارنة فترات.

### هـ) النظام
- **Notifications / التنبيهات**: تنبيهات نظام (حجز جديد، إلغاء، تحذير مقعد مكرر، صيانة قادمة).
- **Agency Settings / إعدادات الوكالة**: اسم الوكالة، الشعار (رفع صورة)، صورة الباص الرئيسية، رقم الحساب البنكي للتحويل، العملة، الضريبة، قالب التذكرة، ساعات العمل.
- **Audit Log / سجل التدقيق**: كل فعل حساس (إلغاء تذكرة، تعديل سعر، حذف حجز) مع من فعله ومتى.

---

## 4. المكدس التقني (Stack)

- **Frontend**: React 19 + TanStack Start v1 (SSR) + Vite 7 + TypeScript strict.
- **Routing**: TanStack Router file-based داخل `src/routes/`.
- **Styling**: Tailwind CSS v4 (CSS-first عبر `src/styles.css` مع `@import "tailwindcss"` و `@theme inline`). لا `tailwind.config.js`.
- **UI kit**: shadcn/ui (Radix) مع تخصيص كامل للتوكنز.
- **State/Data**: TanStack Query — `ensureQueryData` في الـ loader + `useSuspenseQuery` في المكوّن.
- **Backend**: Supabase (PostgreSQL + Row Level Security + Storage + Auth).
- **Server logic**: `createServerFn` من `@tanstack/react-start` للـ RPC، و `src/routes/api/*` للـ webhooks فقط.
- **الطباعة**: `react-to-print` أو HTML/CSS `@media print` لتوليد التذاكر والمنفستو.
- **Charts**: Recharts.
- **Icons**: lucide-react.
- **Forms**: react-hook-form + zod.
- **Tables**: TanStack Table.
- **الخط العربي**: Cairo (أساسي) + Mujahed (للعناوين البارزة).

---

## 5. نظام التصميم (Design System)

### أ) الفلسفة
- **Enterprise Dashboard حديث** — مستوحى من Linear + Notion + Supabase Dashboard + Vercel، ليس مستوحى من التطبيقات الملوّنة الطفولية.
- كثافة معلومات عالية على سطح المكتب، مع مساحات تنفس واضحة.
- Data-first: الأرقام والجداول هي البطل، والألوان تُستخدم للدلالة لا للزينة.
- RTL كامل — كل الأيقونات والأسهم تنعكس منطقيًا (السهم "للأمام" يذهب يسارًا).

### ب) الألوان (Semantic Tokens — oklch)
عرّفها في `src/styles.css` تحت `:root` و `.dark` ثم اربطها في `@theme inline`. **ممنوع منعًا باتًا** استخدام `text-white`، `bg-black`، `bg-[#...]` مباشرة في المكوّنات.

Light mode:
- `--background: oklch(0.99 0.003 240)` — خلفية عامة تقريبًا بيضاء بلمسة رمادية باردة
- `--foreground: oklch(0.22 0.04 255)` — نص أساسي داكن مزرقّ
- `--card: oklch(1 0 0)` — بطاقات بيضاء صافية
- `--muted: oklch(0.96 0.008 240)` — خلفية ثانوية للـ hover والصفوف المتناوبة
- `--muted-foreground: oklch(0.52 0.02 250)` — نص ثانوي رمادي
- `--border: oklch(0.9 0.01 240)` — حدود ناعمة جدًا
- `--primary: oklch(0.36 0.1 250)` — كحلي عميق (الهوية)
- `--accent: oklch(0.72 0.17 52)` — برتقالي دافئ (CTA فقط، بشحّ)
- `--success: oklch(0.62 0.14 155)` — أخضر
- `--warning: oklch(0.78 0.15 85)` — كهرماني
- `--destructive: oklch(0.58 0.22 27)` — أحمر

Dark mode: نفس الفلسفة، خلفية `oklch(0.18 0.02 260)`، بطاقات `oklch(0.22 0.025 260)`.

### ج) الطباعة (Typography)
- عناوين كبيرة: Mujahed / Cairo 800، tracking ضيّق.
- H1: `text-3xl font-extrabold` — H2: `text-xl font-bold` — H3: `text-base font-bold`.
- نص جدول: `text-sm` — Label: `text-xs uppercase tracking-wide text-muted-foreground` (بالإنجليزي)، أو `text-xs font-semibold text-muted-foreground` (بالعربي).
- أرقام مالية: دومًا بخط `tabular-nums` وبمحاذاة يمين في الجداول.

### د) المسافات والزوايا
- Radius: `--radius: 0.9rem` — البطاقات `rounded-2xl`، الأزرار `rounded-xl`، الحقول `rounded-lg`.
- تباعد داخلي للبطاقات: `p-4` على الجوال، `p-6` على سطح المكتب.
- Shadows خفيفة جدًا: `shadow-sm` افتراضيًا، `shadow-card` للبطاقات المرتفعة. لا ظلال ثقيلة.

### هـ) نمط الحركة (Motion)
- انتقالات دقيقة 150–200ms، `ease-out`.
- الجداول: fade-in للصفوف الجديدة فقط، بدون ستاغر مبالغ فيه.
- Sidebar: تحويل عرض ناعم عند الطي.
- تجنّب animations زخرفية — كل حركة يجب أن تخدم إدراك المستخدم لتغيّر الحالة.

---

## 6. تخطيط الواجهة (Layout Pattern)

```text
┌────────────────────────────────────────────────────────────────┐
│  TopBar: شعار + اسم الوكالة + بحث عام + إشعارات + ملف المستخدم │
├──────────────┬─────────────────────────────────────────────────┤
│              │  Breadcrumb: المجموعة / التبويب                 │
│   Sidebar    ├─────────────────────────────────────────────────┤
│   (240px)    │                                                 │
│              │              محتوى الوحدة                       │
│   مجموعات    │        (max-w-7xl، مساحة تنفس)                  │
│   ERP        │                                                 │
│   قابلة      │                                                 │
│   للطي       │                                                 │
│              │                                                 │
└──────────────┴─────────────────────────────────────────────────┘
```

- **Sidebar**: عرض 240px على lg+، مطويّ بأيقونات 64px على md، Drawer على الجوال.
- **TopBar**: ارتفاع 56px، ثابت أعلى الشاشة (`sticky top-0`).
- **Content**: `max-w-7xl mx-auto`، padding `p-6 lg:p-8`.
- **Breakpoints**: mobile < 768, tablet 768–1024, desktop 1024+.
- **الجداول** تأخذ العرض الكامل مع scroll أفقي عند الضرورة، ولا تنكسر لكاردات على الجوال (الميزة الرئيسية للـ ERP).

---

## 7. أنماط المكوّنات المتكررة (Component Patterns)

- **DataTable**: TanStack Table + فلاتر أعلى + Pagination أسفل + Export CSV/PDF + Bulk actions.
- **StatCard**: أيقونة ملوّنة يمين، Label رمادي، قيمة `text-2xl font-extrabold`، تغيّر النسبة أخضر/أحمر.
- **FormDialog / Sheet**: Sheet جانبي على الجوال، Modal مركزي على سطح المكتب.
- **SeatMap**: شبكة CSS Grid، لكل مقعد state ولون دلالي، Tooltip باسم الراكب.
- **Toast**: sonner، أعلى-يمين في RTL.
- **EmptyState**: أيقونة كبيرة، عنوان، وصف، زر CTA.

---

## 8. قاعدة البيانات (مخطط مختصر)

كل جدول public يحتاج:
1. `CREATE TABLE`
2. `GRANT` مناسب
3. `ENABLE ROW LEVEL SECURITY`
4. `CREATE POLICY`

الجداول الأساسية:
- `agencies` (id, name, logo_url, bus_image_url, bank_account, currency, owner_id)
- `profiles` (id → auth.users, name, phone, agency_id)
- `user_roles` (user_id, role app_role, agency_id) — دور مخزّن في جدول منفصل حصريًا (منع escalation).
- `buses` (agency_id, plate, type, seats, seat_map jsonb, image_url, status)
- `routes` (agency_id, from_city, to_city, base_price, duration_h, active)
- `trips` (agency_id, route_id, bus_id, driver_id, depart_at, price, status, thumbnail_url, description, active)
- `bookings` (agency_id, trip_id, passenger_name, passenger_phone, seat_numbers int[], total, payment_method, status, issued_by uuid, ref, created_at)
- `seat_locks` (trip_id, seat_number, locked_by, expires_at) — منع تضارب المقاعد.
- `employees` (agency_id, name, phone, role, status, user_id nullable)
- `commissions` (broker_id, booking_id, amount, settled_at)
- `notifications` (agency_id, title, body, read, created_at)
- `audit_log` (agency_id, actor_id, action, entity, entity_id, before jsonb, after jsonb, created_at)

RLS: كل جدول مقيّد بـ `agency_id = (SELECT agency_id FROM profiles WHERE id = auth.uid())`.
دالة `has_role(_user_id, _role)` بـ SECURITY DEFINER للتحقق من الأدوار داخل السياسات.

---

## 9. الأدوار والصلاحيات

| الدور | Overview | POS | Bookings | Trips | Buses | Employees | Reports | Settings | Audit |
|-------|----------|-----|----------|-------|-------|-----------|---------|----------|-------|
| owner | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| manager | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| cashier | ✓ | ✓ | ✓(خاصة به) | قراءة | — | — | — | — | — |
| accountant | ✓ | — | قراءة | قراءة | — | — | ✓ | — | قراءة |
| supervisor | ✓ | قراءة | ✓ | ✓ | قراءة | قراءة | ✓ | — | ✓ |
| broker | ✓(محدود) | ✓ | خاصة به | قراءة | — | — | خاصة به | — | — |
| inspector | — | — | قراءة | قراءة اليوم | — | — | — | — | — |

---

## 10. متطلبات جودة إلزامية

- **RTL أولًا**: كل padding/margin/positional يستخدم `ps-*` و `pe-*` و `start`/`end` بدل `left`/`right`.
- **A11y**: `aria-label` عربي على كل أيقونة قابلة للنقر، تباين WCAG AA.
- **Performance**: skeleton loaders لكل fetch، لا مؤشر تحميل عام يخفي الشاشة.
- **Empty states** لكل قائمة.
- **Error boundaries** على كل route (`errorComponent` + `notFoundComponent`).
- **SEO** على route settings عام: title + meta description + og.
- **لا بيانات mock مرئية** في الإنتاج — كل قيمة من Supabase.
- **Print styles** للتذكرة والمنفستو (`@media print`).
- **Toasts** بدل `alert()`.
- **Confirm dialog** قبل كل delete/cancel.

---

## 11. تدفقات حرجة (Critical User Flows)

1. **إصدار تذكرة**: كاشير يفتح POS → يختار رحلة اليوم → يفتح SeatMap → يختار مقعد (يُقفَل 15 دقيقة) → يدخل بيانات المسافر → يختار طريقة الدفع → يُنشئ حجزًا → يطبع التذكرة → المقعد يصبح "مدفوع".
2. **إلغاء تذكرة**: كاشير/مشرف يفتح الحجز → يضغط إلغاء → dialog تأكيد + سبب → المقعد يعود متاحًا → سطر في audit_log.
3. **إغلاق يوم الكاشير**: نهاية الوردية → شاشة مطابقة → إجمالي نقدي متوقّع vs. فعلي → توقيع → قفل الحجوزات لذاك اليوم لهذا الكاشير.
4. **رفع رحلة كعرض**: مدير → Trips → New → صورة مصغّرة + وصف + سعر → active=true → يظهر في تطبيق المسافر (خارج نطاق هذا الـ ERP لكن API جاهز).
5. **مسح تذكرة عند الصعود**: مفتش يفتح Inspector على تابلت → يمسح QR التذكرة → مطابقة مع منفستو الرحلة → تعليم "صعد".

---

## 12. قائمة تنفيذ مقترحة (Priority)

المرحلة 1 (MVP): Auth + Agencies + Employees + Roles + Buses + Routes + Trips + POS بسيط + Bookings + SeatMap + Manifest + Overview + Agency Settings.
المرحلة 2: Reports مفصّل + Accountant + Broker/Commissions + Audit Log + Notifications.
المرحلة 3: Inspector (QR) + Print templates متقدّمة + Multi-agency SaaS + Billing.

---

## 13. ما هو خارج النطاق

- تطبيق المسافر (Traveler app) — مشروع منفصل يستهلك نفس Supabase API.
- الدفع الإلكتروني الفعلي (بوابات) — يُسجَّل كطريقة دفع فقط في المرحلة 1.
- التطبيقات الأصلية (iOS/Android) — الويب أولًا.

---

**ابدأ التنفيذ بإنشاء الـ scaffold، ثم الـ Auth ونظام الأدوار، ثم Overview، ثم POS + SeatMap. التزم بنظام التصميم أعلاه بلا انحراف، ولا تستخدم ألوانًا مباشرة خارج التوكنز الدلالية.**

---

هل تريد أن أضيف قسمًا آخر (مثل: مخطط ERD مفصّل، أو نص SQL جاهز للجداول، أو نصوص UI العربية الجاهزة للنسخ) قبل أن تسلّم البرومبت؟

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4afcb90b-3afb-4abb-bc4b-4ad0cf0609e6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
