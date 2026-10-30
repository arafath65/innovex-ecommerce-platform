"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  CookingPot,
  LayoutGrid,
  Sparkles,
  X,
} from "lucide-react";

type GuideId = "cookware" | "organization" | "care";

type GuideSection = {
  title: string;
  points: string[];
};

type Guide = {
  id: GuideId;
  number: string;
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  button: string;
  icon: typeof CookingPot;
  sections: GuideSection[];
};

const guides: Guide[] = [
  {
    id: "cookware",
    number: "01",
    eyebrow: "BUYING GUIDE",
    title: "Choose the Right Cookware",
    description:
      "Understand the differences between popular cookware types and choose what suits your cooking style.",
    image: "/kitchen-guides/cookware-guide.webp",
    imageAlt: "A selection of non-stick, stainless steel and casserole cookware",
    button: "Explore cookware guide",
    icon: CookingPot,
    sections: [
      {
        title: "Non-stick cookware",
        points: [
          "A practical choice for eggs, pancakes and everyday low-to-medium-heat cooking.",
          "Use wooden, silicone or other coating-safe utensils to help protect the surface.",
          "Avoid overheating an empty pan and follow the maker's cleaning instructions.",
        ],
      },
      {
        title: "Stainless steel",
        points: [
          "Versatile for boiling, sautéing, browning and many everyday cooking tasks.",
          "Preheat gradually and use a suitable amount of oil to help reduce sticking.",
          "Let the cookware cool before washing and use a non-abrasive cleaner where possible.",
        ],
      },
      {
        title: "Cast iron",
        points: [
          "Holds heat well and is useful for searing and steady heat during cooking.",
          "Dry thoroughly after washing to help prevent rust.",
          "Follow the product's seasoning and care instructions.",
        ],
      },
      {
        title: "Ceramic-coated cookware",
        points: [
          "Offers a non-stick-style cooking surface with a different coating construction.",
          "Use gentle heat and coating-safe utensils unless the product specifies otherwise.",
          "Avoid sudden temperature changes and abrasive cleaning tools.",
        ],
      },
    ],
  },
  {
    id: "organization",
    number: "02",
    eyebrow: "SMART IDEAS",
    title: "Smart Kitchen Organization",
    description:
      "Simple ways to make cupboards, drawers and countertops feel neater and easier to use.",
    image: "/kitchen-guides/organization-guide.webp",
    imageAlt: "Organized pantry jars and neatly divided kitchen drawers",
    button: "Get organization ideas",
    icon: LayoutGrid,
    sections: [
      {
        title: "Make pantry storage simple",
        points: [
          "Group similar ingredients together, such as baking items, grains and spices.",
          "Use clear, food-safe containers and label them so ingredients are easy to identify.",
          "Keep frequently used ingredients within easy reach and rotate older items forward.",
        ],
      },
      {
        title: "Give every drawer a purpose",
        points: [
          "Use dividers to separate cutlery, cooking tools and small accessories.",
          "Keep everyday utensils near the food-preparation area where possible.",
          "Avoid overfilling drawers so items remain easy to find and return.",
        ],
      },
      {
        title: "Use cabinet space wisely",
        points: [
          "Group plates, bowls, cups and cookware by how often they are used.",
          "Consider shelf risers or stackable organizers to make better use of vertical space.",
          "Store heavier cookware on lower shelves for easier and safer access.",
        ],
      },
      {
        title: "Keep countertops practical",
        points: [
          "Leave clear space for food preparation instead of displaying every appliance.",
          "Use a tray or holder to group the few utensils you reach for every day.",
          "Return less frequently used equipment to a cabinet after use.",
        ],
      },
    ],
  },
  {
    id: "care",
    number: "03",
    eyebrow: "CARE & MAINTENANCE",
    title: "Care for Your Kitchenware",
    description:
      "Small care habits that help keep cookware, utensils and kitchen tools in good condition.",
    image: "/kitchen-guides/care-guide.webp",
    imageAlt: "A non-stick frying pan being gently cleaned with a soft sponge",
    button: "Read care tips",
    icon: Sparkles,
    sections: [
      {
        title: "Non-stick pans",
        points: [
          "Allow the pan to cool before washing; avoid sudden temperature changes.",
          "Use a soft sponge and a coating-safe utensil rather than metal tools.",
          "Avoid abrasive cleaners and follow the manufacturer's heat limits.",
        ],
      },
      {
        title: "Stainless steel cookware",
        points: [
          "Wash with warm water and a suitable dishwashing liquid after use.",
          "For stuck-on food, soak the cookware before cleaning rather than scraping aggressively.",
          "Dry after washing to reduce water marks.",
        ],
      },
      {
        title: "Wooden and bamboo utensils",
        points: [
          "Hand wash and dry promptly; do not leave wooden items soaking in water.",
          "Store only when completely dry.",
          "Use food-safe conditioning oil only when recommended for that product.",
        ],
      },
      {
        title: "Knives and cutting boards",
        points: [
          "Wash and dry knives promptly, then store them safely in a block or suitable holder.",
          "Use a suitable cutting board to protect both the blade and work surface.",
          "Clean cutting boards thoroughly and allow them to dry fully before storing.",
        ],
      },
    ],
  },
];

export default function KitchenCompanion({
  primaryColor,
  shopHref,
}: {
  primaryColor: string;
  shopHref: string;
}) {
  const [activeGuide, setActiveGuide] = useState<Guide | null>(null);

  useEffect(() => {
    if (!activeGuide) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveGuide(null);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeGuide]);

  return (
    <>
      <section className="relative overflow-hidden bg-[#F7F4ED] py-14 sm:py-16 lg:py-20">
        <div className="pointer-events-none absolute -left-24 top-12 h-64 w-64 rounded-full bg-[#E9E3D7]/60 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-[#F0DDD5]/55 blur-3xl" />

        <div className="relative mx-auto max-w-[1440px] px-4 sm:px-7 lg:px-12">
          <div className="mx-auto mb-9 max-w-2xl text-center sm:mb-11">
            <p
              className="text-[10px] font-bold uppercase tracking-[0.24em]"
              style={{ color: primaryColor }}
            >
              The Kitchen Companion
            </p>
            <h2 className="mt-3 text-2xl font-medium leading-tight tracking-[-0.045em] text-[#292B25] sm:text-3xl lg:text-[2.55rem]">
              Helpful guides for a <span style={{ color: primaryColor }}>better kitchen life.</span>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-xs leading-6 text-[#77776D] sm:text-sm">
              Practical advice, useful insights and smart ideas to make your
              everyday cooking and kitchen life easier.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 xl:gap-6">
            {guides.map((guide) => {
              const Icon = guide.icon;

              return (
                <article
                  key={guide.id}
                  className="group flex min-w-0 flex-col overflow-hidden rounded-[22px] border border-black/[0.055] bg-white shadow-[0_8px_28px_rgba(48,43,34,0.045)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(48,43,34,0.09)]"
                >
                  <div className="relative aspect-[16/8.8] overflow-hidden bg-[#EAE6DC]">
                    <Image
                      src={guide.image}
                      alt={guide.imageAlt}
                      fill
                      sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 33vw"
                      className="object-cover transition duration-700 group-hover:scale-[1.045]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
                    <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full border border-white/50 bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
                      <span
                        className="grid size-7 place-items-center rounded-full text-white"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <Icon size={15} strokeWidth={1.8} />
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#55564F]">
                        Guide {guide.number}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col px-5 pb-5 pt-5 sm:px-6 sm:pb-6">
                    <p
                      className="text-[9px] font-bold uppercase tracking-[0.19em]"
                      style={{ color: primaryColor }}
                    >
                      {guide.eyebrow}
                    </p>
                    <h3 className="mt-2 text-xl font-medium leading-tight tracking-[-0.035em] text-[#292B25] sm:text-[1.35rem]">
                      {guide.title}
                    </h3>
                    <p className="mt-2 min-h-[3.5rem] text-xs leading-6 text-[#77776D] sm:text-[13px]">
                      {guide.description}
                    </p>

                    <div className="mt-4 space-y-2.5">
                      {guide.sections.slice(0, 3).map((section) => (
                        <div key={section.title} className="flex items-start gap-2.5">
                          <span
                            className="mt-0.5 grid size-[17px] shrink-0 place-items-center rounded-full text-white"
                            style={{ backgroundColor: primaryColor }}
                          >
                            <Check size={10} strokeWidth={3} />
                          </span>
                          <p className="text-[11px] leading-[1.45rem] text-[#55564F]">
                            {section.title}
                          </p>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveGuide(guide)}
                      className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-[11px] font-semibold text-white transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {guide.button}
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {activeGuide && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#171914]/65 p-3 backdrop-blur-sm sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setActiveGuide(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="kitchen-guide-title"
            className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[24px] bg-[#FBFAF7] shadow-2xl"
          >
            <div className="relative flex items-start justify-between gap-5 border-b border-black/[0.07] px-5 py-5 sm:px-8 sm:py-6">
              <div>
                <p
                  className="text-[9px] font-bold uppercase tracking-[0.2em]"
                  style={{ color: primaryColor }}
                >
                  The Kitchen Companion · {activeGuide.eyebrow}
                </p>
                <h2
                  id="kitchen-guide-title"
                  className="mt-2 max-w-2xl text-2xl font-medium leading-tight tracking-[-0.04em] text-[#292B25] sm:text-3xl"
                >
                  {activeGuide.title}
                </h2>
                <p className="mt-2 max-w-2xl text-xs leading-6 text-[#77776D] sm:text-sm">
                  {activeGuide.description}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close guide"
                onClick={() => setActiveGuide(null)}
                className="grid size-10 shrink-0 place-items-center rounded-full border border-black/10 bg-white text-[#292B25] transition hover:bg-[#F0EDE4]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-5 sm:px-8 sm:py-7">
              <div className="grid gap-4 sm:grid-cols-2">
                {activeGuide.sections.map((section, index) => (
                  <article
                    key={section.title}
                    className="rounded-2xl border border-black/[0.06] bg-white p-4 sm:p-5"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <h3 className="text-sm font-semibold text-[#292B25]">
                        {section.title}
                      </h3>
                    </div>
                    <ul className="mt-4 space-y-3">
                      {section.points.map((point) => (
                        <li key={point} className="flex items-start gap-2.5">
                          <Check
                            size={15}
                            className="mt-0.5 shrink-0"
                            style={{ color: primaryColor }}
                          />
                          <span className="text-xs leading-6 text-[#67685F]">
                            {point}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-black/[0.07] bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <p className="text-[10px] leading-5 text-[#85857B]">
                Always follow the care and safety instructions supplied with your product.
              </p>
              <Link
                href={shopHref}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[11px] font-semibold text-white transition hover:brightness-95"
                style={{ backgroundColor: primaryColor }}
              >
                Explore kitchen essentials
                <ArrowRight size={14} />
              </Link>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
