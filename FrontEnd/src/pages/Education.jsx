import {
  ArrowRight,
  BookOpen,
  Bookmark,
  Calendar,
  Clock,
  Search,
  Tag,
  TrendingUp,
} from "lucide-react";

import DashboardHeader from "../components/DashboardHeader.jsx";
import DashboardSidebar from "../components/DashboardSidebar.jsx";

const categories = [
  "Waste Management",
  "Climate Change",
  "Smart City",
  "Environmental Education",
  "Technology & Sustainability",
];

const articles = [
  {
    title: "Designing Zero-Waste Campuses with SmartBin AI",
    description:
      "Practical steps to transform waste streams into measurable circular economy wins.",
    category: "Waste Management",
    date: "Jan 18, 2026",
    read: "6 min read",
    image:
      "https://images.unsplash.com/photo-1528323273322-d81458248d40?auto=format&fit=crop&w=1400&q=80",
  },
  {
    title: "AI + IoT: The Backbone of a Sustainable Smart City",
    description:
      "How sensor networks and computer vision reduce landfill dependency at scale.",
    category: "Smart City",
    date: "Jan 10, 2026",
    read: "8 min read",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80",
  },
  {
    title: "Recycling Contamination: The Hidden Climate Cost",
    description:
      "Why precision sorting is critical for lowering emissions and improving recovery rates.",
    category: "Climate Change",
    date: "Dec 29, 2025",
    read: "5 min read",
    image:
      "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1400&q=80",
  },
  {
    title: "Building a Culture of Sustainable Habits",
    description:
      "Education strategies that shift daily behavior toward reuse, repair, and recycling.",
    category: "Environmental Education",
    date: "Dec 12, 2025",
    read: "7 min read",
    image:
      "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1400&q=80",
  },
];

const briefs = [
  {
    title: "3-minute guide: Fixing contamination at source",
    tag: "Quick Read",
    time: "2 hours ago",
  },
  {
    title: "Campus waste audits: What to measure first",
    tag: "Checklist",
    time: "Yesterday",
  },
  {
    title: "How to brief volunteers on smart sorting",
    tag: "Training",
    time: "Jan 20, 2026",
  },
];

const trending = [
  "Plastic recovery rates in urban districts",
  "AI vision accuracy benchmarks",
  "Pay-as-you-throw policy updates",
  "Community composting playbooks",
];

const Education = () => {
  const [topStory, ...latestArticles] = articles;

  return (
    <div className="relative min-h-screen bg-[#F5F7F5] text-[#1F2937]">
      <div className="min-h-screen">
        <DashboardSidebar />

        <div className="flex min-h-screen flex-1 flex-col pl-20 lg:pl-64">
          <DashboardHeader
            title="Education"
            breadcrumb="Home / Education"
            searchPlaceholder="Search articles, topics, or reports"
          />

          <main className="mx-auto w-full max-w-6xl flex-1 px-6 pb-16 pt-28">
            <section className="grid gap-8 lg:grid-cols-[1.6fr_0.9fr]">
              <div className="space-y-8">
                <div className="rounded-3xl border border-[#E2E8F0] bg-white shadow-sm">
                  <div className="grid gap-0 md:grid-cols-[1.2fr_0.8fr]">
                    <div className="h-64 overflow-hidden md:h-full">
                      <img
                        src={topStory.image}
                        alt={topStory.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex flex-col justify-center gap-4 p-6">
                      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#228B22]">
                        <BookOpen className="h-4 w-4" />
                        Top story
                      </div>
                      <h2 className="text-2xl font-semibold text-[#1F2937]">{topStory.title}</h2>
                      <p className="text-sm text-[#475569]">{topStory.description}</p>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-[#6B7280]">
                        <span className="inline-flex items-center gap-2">
                          <Tag className="h-4 w-4" />
                          {topStory.category}
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {topStory.date}
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {topStory.read}
                        </span>
                      </div>
                      <button className="inline-flex items-center gap-2 text-sm font-semibold text-[#228B22]">
                        Read full story
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-[#1F2937]">Latest updates</h3>
                      <p className="text-sm text-[#6B7280]">Fresh guidance and field notes.</p>
                    </div>
                    <button className="hidden md:inline-flex items-center gap-2 text-xs font-semibold text-[#228B22]">
                      View all
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-6 space-y-6">
                    {latestArticles.map((article) => (
                      <article
                        key={article.title}
                        className="flex flex-col gap-4 border-b border-[#F1F5F9] pb-6 last:border-b-0 last:pb-0 md:flex-row"
                      >
                        <div className="h-32 w-full overflow-hidden rounded-2xl md:w-48">
                          <img
                            src={article.image}
                            alt={article.title}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="flex flex-1 flex-col gap-3">
                          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#228B22]">
                            <span>{article.category}</span>
                          </div>
                          <h4 className="text-lg font-semibold text-[#1F2937]">{article.title}</h4>
                          <p className="text-sm text-[#475569]">{article.description}</p>
                          <div className="flex flex-wrap items-center gap-4 text-xs text-[#6B7280]">
                            <span className="inline-flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              {article.date}
                            </span>
                            <span className="inline-flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              {article.read}
                            </span>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </div>

              <aside className="space-y-6">
                <div className="rounded-3xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#6B7280]">
                    <Search className="h-4 w-4" />
                    Search
                  </div>
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      placeholder="Search education library"
                      className="w-full rounded-full border border-[#E2E8F0] bg-white px-3 py-2 text-xs text-[#1F2937] focus:border-[#228B22] focus:outline-none"
                    />
                    <button className="rounded-full border border-[#E2E8F0] px-4 text-xs font-semibold text-[#1F2937] hover:border-[#CBD5F5]">
                      Go
                    </button>
                  </div>
                </div>

                <div className="rounded-3xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#6B7280]">
                    <Tag className="h-4 w-4" />
                    Topics
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {categories.map((category) => (
                      <button
                        key={category}
                        className="rounded-full border border-[#E2E8F0] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#475569] hover:border-[#CBD5F5] hover:text-[#1F2937]"
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#6B7280]">
                    <TrendingUp className="h-4 w-4" />
                    Trending
                  </div>
                  <div className="mt-4 space-y-3 text-sm text-[#475569]">
                    {trending.map((item) => (
                      <div key={item} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#228B22]" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#6B7280]">
                    <Bookmark className="h-4 w-4" />
                    Briefs
                  </div>
                  <div className="mt-4 space-y-4">
                    {briefs.map((brief) => (
                      <div key={brief.title} className="border-b border-[#F1F5F9] pb-3 last:border-b-0 last:pb-0">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#228B22]">
                          {brief.tag}
                        </div>
                        <div className="mt-1 text-sm font-semibold text-[#1F2937]">
                          {brief.title}
                        </div>
                        <div className="mt-1 text-xs text-[#6B7280]">{brief.time}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Education;
