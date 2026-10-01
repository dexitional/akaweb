// Starter content so a fresh install has a complete site structure to edit:
// every menu page (with page-builder blocks), departments and units,
// placeholder people and a few posts. Idempotent — rows that already exist
// (same section+slug, kind+slug, type+slug) are left untouched, so it never
// overwrites edits made in the CMS.
//
// All wording is a starting point for the college to review. People are
// placeholders in [brackets] — replace them in Admin → People.
import "dotenv/config";
import { randomUUID } from "node:crypto";
import mysql from "mysql2/promise";

const id = () => randomUUID().slice(0, 12);
const p = (...paras: Array<string>) => paras.map((t) => `<p>${t}</p>`).join("");

type Block = Record<string, unknown>;

interface PageSeed {
  section: string;
  slug: string;
  title: string;
  summary: string;
  body?: string;
  blocks: Array<Block>;
}

const PAGES: Array<PageSeed> = [
  // ---- About Us ------------------------------------------------------------
  {
    section: "about",
    slug: "history",
    title: "History of the College",
    summary: "From its founding in 1963 to a modern College of Education training teachers for Ghana's basic schools.",
    body: p(
      "Akatsi College of Education was established in 1963 to help meet Ghana's growing need for trained teachers. Located in Akatsi in the Volta Region, the college has grown from a small teacher training institution into a tertiary College of Education offering Bachelor of Education programmes.",
      "Over the decades, thousands of teachers trained at Akatsi have served in classrooms across the country. Our motto — <strong>Head, Heart, Hands</strong> — expresses the college's belief that great teachers combine knowledge, character and practical skill.",
    ),
    blocks: [
      {
        id: id(),
        type: "stats",
        title: "Milestones",
        items: [
          { value: "1963", label: "Year founded" },
          { value: "60+", label: "Years of teacher education" },
          { value: "B.Ed", label: "Degree programmes" },
          { value: "Volta", label: "Region, Ghana" },
        ],
      },
      {
        id: id(),
        type: "cards",
        title: "Our crest",
        intro: "The symbols on the college crest tell our story.",
        columns: 3,
        items: [
          { title: "The open book", text: "Knowledge and lifelong learning — the Head.", imageUrl: "", url: "" },
          { title: "The torch", text: "Enlightenment carried into every classroom the college serves.", imageUrl: "", url: "" },
          { title: "The green shield", text: "Growth, service and the community the college belongs to — the Heart and Hands.", imageUrl: "", url: "" },
        ],
      },
    ],
  },
  {
    section: "about",
    slug: "office-of-the-principal",
    title: "Office of the Principal",
    summary: "The Principal provides academic and administrative leadership for the college.",
    blocks: [
      {
        id: id(),
        type: "quote",
        quote:
          "Our task is to form teachers who think deeply, care genuinely and teach skilfully. Welcome to Akatsi College of Education.",
        author: "[Name of Principal]",
        role: "Principal",
        imageUrl: "",
      },
      {
        id: id(),
        type: "richText",
        html: p(
          "The Office of the Principal oversees the academic, administrative and welfare affairs of the college, working with the Governing Council, management and staff to deliver quality teacher education.",
        ),
      },
      { id: id(), type: "people", title: "The Principal's office", intro: "", group: "principal_office", layout: "grid" },
    ],
  },
  {
    section: "about",
    slug: "management",
    title: "College Management",
    summary: "The team responsible for the day-to-day leadership of the college.",
    blocks: [
      { id: id(), type: "people", title: "Management", intro: "", group: "management", layout: "grid" },
      { id: id(), type: "people", title: "Governing Council", intro: "", group: "governing_council", layout: "list" },
    ],
  },
  {
    section: "about",
    slug: "contact-us",
    title: "Contact Us",
    summary: "Get in touch with the college — we're happy to help.",
    blocks: [{ id: id(), type: "contact", title: "Get in touch", intro: "Send us a message and the right office will respond.", showForm: true, showMap: true }],
  },

  // ---- Academics -----------------------------------------------------------
  {
    section: "academics",
    slug: "departments",
    title: "Academic Departments",
    summary: "Our departments deliver the four-year Bachelor of Education programmes.",
    blocks: [{ id: id(), type: "departments", title: "", intro: "", kind: "department" }],
  },
  {
    section: "academics",
    slug: "units",
    title: "Units of the College",
    summary: "The offices that support teaching, learning and student welfare.",
    blocks: [{ id: id(), type: "departments", title: "", intro: "", kind: "unit" }],
  },
  {
    section: "academics",
    slug: "student-affairs",
    title: "Student Affairs",
    summary: "Supporting the welfare, discipline and development of every student-teacher.",
    body: p(
      "The Office of Student Affairs, led by the Dean of Students, coordinates student welfare, accommodation, discipline and co-curricular activities. It works closely with the Students' Representative Council (SRC), hall tutors and the counselling unit.",
    ),
    blocks: [
      {
        id: id(),
        type: "cards",
        title: "What we do",
        intro: "",
        columns: 3,
        items: [
          { title: "Welfare & accommodation", text: "Hall allocation, welfare support and a safe campus environment.", imageUrl: "", url: "" },
          { title: "Guidance & counselling", text: "Confidential support for personal and academic concerns.", imageUrl: "", url: "" },
          { title: "Clubs & activities", text: "Sports, cultural troupes, religious groups and clubs.", imageUrl: "", url: "/student-life/student-services" },
        ],
      },
      { id: id(), type: "documents", title: "Student documents", intro: "", category: "handbook", limit: 6 },
    ],
  },

  // ---- Admissions ----------------------------------------------------------
  {
    section: "admissions",
    slug: "how-to-apply",
    title: "How to Apply",
    summary: "Admission to Colleges of Education in Ghana is through a common online application.",
    blocks: [
      {
        id: id(),
        type: "callout",
        tone: "info",
        title: "Applications open once a year",
        text: "Watch the Announcements page for the opening date, deadlines and the official admission notice.",
      },
      {
        id: id(),
        type: "steps",
        title: "Steps to apply",
        intro: "",
        items: [
          { title: "Check the entry requirements", text: "Make sure your WASSCE/SSSCE results meet the minimum requirements." },
          { title: "Buy an application voucher", text: "Vouchers are sold through the approved channels named in the official admission notice." },
          { title: "Complete the online application", text: "Fill in the online form, choose Akatsi College of Education and upload the required documents." },
          { title: "Sit the entrance assessment", text: "Shortlisted applicants are invited for an entrance examination and/or interview." },
          { title: "Check your admission status", text: "Successful applicants receive admission letters with reporting instructions." },
        ],
      },
      {
        id: id(),
        type: "faq",
        title: "Frequently asked questions",
        items: [
          { question: "Which programmes can I apply for?", answer: "The college offers Bachelor of Education programmes for Early Grade, Upper Primary and Junior High School teaching." },
          { question: "Is there an allowance for trainees?", answer: "Information on government support for teacher trainees is published with the admission notice each year." },
          { question: "Who do I contact with questions?", answer: "Use the Contact Us page or call the college during office hours." },
        ],
      },
      { id: id(), type: "documents", title: "Admission documents", intro: "", category: "admissions", limit: 10 },
    ],
  },
  {
    section: "admissions",
    slug: "entry-requirements",
    title: "Entry Requirements",
    summary: "Minimum academic requirements for admission to the B.Ed programmes.",
    body: p(
      "Applicants should hold credit passes (A1–C6) in six subjects in the WASSCE, including the core subjects of English Language, Mathematics and Integrated Science, plus three elective subjects relevant to the chosen programme. Please refer to the official admission notice for the requirements that apply in the current year.",
    ),
    blocks: [{ id: id(), type: "cta", title: "Ready to apply?", text: "Follow our step-by-step guide.", buttonLabel: "How to apply", buttonUrl: "/admissions/how-to-apply", tone: "navy" }],
  },

  // ---- Student Life --------------------------------------------------------
  {
    section: "student-life",
    slug: "student-leadership",
    title: "Student Leadership",
    summary: "The Students' Representative Council (SRC) gives every student a voice.",
    body: p(
      "The SRC represents students in college governance, organises student activities and promotes the welfare of the student body. Executives are elected each academic year.",
    ),
    blocks: [{ id: id(), type: "people", title: "SRC executives", intro: "", group: "student_leadership", layout: "grid" }],
  },
  {
    section: "student-life",
    slug: "student-services",
    title: "Student Services",
    summary: "Facilities and support services that help students thrive.",
    blocks: [
      {
        id: id(),
        type: "cards",
        title: "",
        intro: "",
        columns: 3,
        items: [
          { title: "Library", text: "Books, journals, e-resources and quiet study spaces.", imageUrl: "", url: "" },
          { title: "ICT services", text: "Computer labs, campus Wi-Fi and e-learning support.", imageUrl: "", url: "" },
          { title: "Health services", text: "First aid and referrals for students' health needs.", imageUrl: "", url: "" },
          { title: "Guidance & counselling", text: "Confidential personal, academic and career counselling.", imageUrl: "", url: "" },
          { title: "Chaplaincy", text: "Spiritual life and religious fellowships on campus.", imageUrl: "", url: "" },
          { title: "Sports & recreation", text: "Inter-hall and inter-college competitions in a range of sports.", imageUrl: "", url: "" },
        ],
      },
    ],
  },

  // ---- Alumni --------------------------------------------------------------
  {
    section: "alumni",
    slug: "alumni-association",
    title: "Alumni Association",
    summary: "Old students of Akatsi College of Education, teaching across Ghana and beyond.",
    body: p(
      "The Alumni Association keeps old students connected with one another and with the college, supporting development projects, mentoring trainees and celebrating the achievements of Akatsi alumni.",
    ),
    blocks: [
      { id: id(), type: "people", title: "Alumni executives", intro: "", group: "alumni_executive", layout: "grid" },
      { id: id(), type: "cta", title: "Stay connected", text: "Update your details and hear about reunions and projects.", buttonLabel: "Get in touch", buttonUrl: "/alumni/stay-connected", tone: "green" },
    ],
  },
  {
    section: "alumni",
    slug: "stay-connected",
    title: "Stay Connected",
    summary: "Send us your details or a message for the Alumni Association.",
    blocks: [{ id: id(), type: "contact", title: "Contact the alumni office", intro: "Tell us your year group, programme and current location.", showForm: true, showMap: false }],
  },
];

const DEPARTMENTS: Array<{ kind: "department" | "unit"; slug: string; name: string; summary: string; programmes?: Array<string> }> = [
  { kind: "department", slug: "education-studies", name: "Department of Education Studies", summary: "Foundations of education, pedagogy, assessment and the teaching practicum.", programmes: ["Supported Teaching in Schools (STS)", "Educational Psychology", "Curriculum and Assessment"] },
  { kind: "department", slug: "mathematics-and-ict", name: "Department of Mathematics and ICT", summary: "Preparing confident teachers of mathematics and computing.", programmes: ["B.Ed Junior High School Mathematics", "B.Ed JHS Information and Communication Technology"] },
  { kind: "department", slug: "science", name: "Department of Science", summary: "Inquiry-based science teaching for basic schools.", programmes: ["B.Ed Junior High School Science"] },
  { kind: "department", slug: "languages", name: "Department of Languages", summary: "English and Ghanaian language education.", programmes: ["B.Ed JHS English Language", "B.Ed Ghanaian Language (Ewe)"] },
  { kind: "department", slug: "social-sciences", name: "Department of Social Sciences", summary: "Social studies, history and religious and moral education.", programmes: ["B.Ed JHS Social Studies", "Religious and Moral Education"] },
  { kind: "department", slug: "early-childhood-and-primary", name: "Department of Early Childhood and Primary Education", summary: "Teachers for the early grades and upper primary.", programmes: ["B.Ed Early Grade Education", "B.Ed Upper Primary Education"] },
  { kind: "department", slug: "vocational-and-technical", name: "Department of Vocational and Technical Education", summary: "Agriculture, home economics and practical skills — the Hands.", programmes: ["B.Ed JHS Agricultural Science", "B.Ed JHS Home Economics"] },
  { kind: "department", slug: "physical-education-and-creative-arts", name: "Department of Physical Education and Creative Arts", summary: "Physical education, music, dance and creative arts.", programmes: ["Physical Education", "Creative Arts and Design"] },
  { kind: "unit", slug: "academic-affairs", name: "Academic Affairs Unit", summary: "Admissions, registration, examinations and academic records." },
  { kind: "unit", slug: "library", name: "College Library", summary: "Print and electronic resources for teaching and learning." },
  { kind: "unit", slug: "ict", name: "ICT Unit", summary: "Campus network, computer labs and e-learning systems." },
  { kind: "unit", slug: "quality-assurance", name: "Quality Assurance Unit", summary: "Monitoring and improving the quality of teaching and services." },
  { kind: "unit", slug: "guidance-and-counselling", name: "Guidance and Counselling Unit", summary: "Personal, academic and career support for students." },
  { kind: "unit", slug: "finance", name: "Finance Office", summary: "Fees, payments and the college's financial administration." },
];

const PEOPLE: Array<{ group: string; name: string; title: string }> = [
  { group: "principal_office", name: "[Name of Principal]", title: "Principal" },
  { group: "principal_office", name: "[Name of Vice Principal]", title: "Vice Principal" },
  { group: "management", name: "[Name of Principal]", title: "Principal" },
  { group: "management", name: "[Name of Vice Principal]", title: "Vice Principal" },
  { group: "management", name: "[Name of College Secretary]", title: "College Secretary" },
  { group: "management", name: "[Name of Finance Officer]", title: "Finance Officer" },
  { group: "management", name: "[Name of College Librarian]", title: "College Librarian" },
  { group: "management", name: "[Name of Dean of Students]", title: "Dean of Students" },
  { group: "student_leadership", name: "[SRC President]", title: "SRC President" },
  { group: "student_leadership", name: "[SRC Vice President]", title: "SRC Vice President" },
  { group: "student_leadership", name: "[SRC General Secretary]", title: "General Secretary" },
  { group: "alumni_executive", name: "[Alumni President]", title: "National President" },
  { group: "alumni_executive", name: "[Alumni Secretary]", title: "National Secretary" },
];

const POSTS: Array<{ type: "news" | "event" | "announcement"; slug: string; title: string; excerpt: string; body: string; category: string; eventStartDays?: number; venue?: string; pinned?: boolean }> = [
  {
    type: "news",
    slug: "welcome-to-our-new-website",
    title: "Welcome to our new college website",
    excerpt: "A new home online for news, events, admissions information and downloads from Akatsi College of Education.",
    body: p(
      "We are pleased to launch the new Akatsi College of Education website. Here you will find information about the college, our departments and units, admissions, student life and the latest news, events and announcements.",
      "Forms, handbooks and other documents are available on the Guides & Downloads page. We welcome your feedback through the Contact Us page.",
    ),
    category: "College News",
  },
  {
    type: "announcement",
    slug: "using-the-downloads-page",
    title: "Official documents now on the Downloads page",
    excerpt: "Forms, handbooks and calendars will be published on the website's Guides & Downloads page.",
    body: p("Students and applicants can now find official forms, handbooks and academic calendars on the Guides & Downloads page."),
    category: "General",
    pinned: true,
  },
  {
    type: "event",
    slug: "orientation-for-new-students",
    title: "Orientation for new students",
    excerpt: "An introduction to college life, academic regulations and student services for first-year students.",
    body: p("All newly admitted students are expected to attend orientation. Details will be confirmed in an official announcement."),
    category: "Academic",
    eventStartDays: 21,
    venue: "College Assembly Hall",
  },
];

function sqlDate(daysFromNow: number, time = "09:00:00") {
  const d = new Date(Date.now() + daysFromNow * 86_400_000);
  return `${d.toISOString().slice(0, 10)} ${time}`;
}

async function main() {
  const uri = process.env.DATABASE_URL;
  if (!uri) throw new Error("DATABASE_URL is not set.");
  const db = await mysql.createConnection({ uri });
  let created = 0;

  for (const [index, page] of PAGES.entries()) {
    const [r] = await db.execute<mysql.ResultSetHeader>(
      `INSERT IGNORE INTO pages (section, slug, title, summary, body, blocks, status, show_in_nav, sort_order, published_at)
       VALUES (?, ?, ?, ?, ?, ?, 'published', 1, ?, NOW())`,
      [page.section, page.slug, page.title, page.summary, page.body ?? null, JSON.stringify(page.blocks), index],
    );
    created += r.affectedRows;
  }

  for (const [index, d] of DEPARTMENTS.entries()) {
    const head = d.kind === "unit" ? "Head of Unit" : "Head of Department";
    const [r] = await db.execute<mysql.ResultSetHeader>(
      `INSERT IGNORE INTO departments (kind, slug, name, summary, head_name, head_title, programmes, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [d.kind, d.slug, d.name, d.summary, `[Name of ${head}]`, head, d.programmes ? JSON.stringify(d.programmes) : null, index],
    );
    created += r.affectedRows;
  }

  // People have no natural key, so only seed an empty table.
  const [[peopleCount]] = await db.query<mysql.RowDataPacket[]>("SELECT COUNT(*) AS n FROM people");
  if (Number(peopleCount?.n) === 0) {
    for (const [index, person] of PEOPLE.entries()) {
      await db.execute("INSERT INTO people (group_key, name, title, sort_order) VALUES (?, ?, ?, ?)", [person.group, person.name, person.title, index]);
      created++;
    }
  }

  for (const post of POSTS) {
    const [r] = await db.execute<mysql.ResultSetHeader>(
      `INSERT IGNORE INTO posts (type, slug, title, excerpt, body, category, is_pinned, status, published_at, event_start, venue)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'published', NOW(), ?, ?)`,
      [
        post.type,
        post.slug,
        post.title,
        post.excerpt,
        post.body,
        post.category,
        post.pinned ? 1 : 0,
        post.eventStartDays !== undefined ? sqlDate(post.eventStartDays) : null,
        post.venue ?? null,
      ],
    );
    created += r.affectedRows;
  }

  console.log(created ? `Seeded ${created} new rows of starter content.` : "Starter content already present — nothing to do.");
  await db.end();
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
