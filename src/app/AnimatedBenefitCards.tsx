import {
  ArrowUpRight,
  Headphones,
  Heart,
  PackageCheck,
  Truck,
} from "lucide-react";

import styles from "./AnimatedBenefitCards.module.css";

const benefits = [
  {
    number: "01",
    title: "Island-wide delivery",
    description: "We deliver right to your doorstep.",
    artwork: "truck",
    icon: Truck,
  },
  {
    number: "02",
    title: "Carefully selected",
    description: "Quality essentials for everyday living.",
    artwork: "package",
    icon: PackageCheck,
  },
  {
    number: "03",
    title: "Here to help",
    description: "Friendly support whenever you need us.",
    artwork: "support",
    icon: Headphones,
  },
  {
    number: "04",
    title: "Made for your home",
    description: "Everyday essentials you'll love.",
    artwork: "home",
    icon: Heart,
  },
] as const;

function TruckArtwork() {
  return (
    <svg
      viewBox="0 0 180 105"
      className="h-full w-full"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 87H175"
        stroke="#B9B1A5"
        strokeWidth="5"
        strokeLinecap="round"
      />

      <path
        d="M5 87H175"
        className={styles.roadDash}
        stroke="#FFFDF9"
        strokeWidth="2"
        strokeDasharray="10 12"
      />

      <path
        d="M24 28c8-10 23-9 29-2 9-5 20 2 18 12H24c-7 0-8-6-4-10Z"
        fill="#FFFFFF"
        opacity=".75"
        className={styles.cloud}
      />

      <g className={styles.truckMove}>
        {/* Lorry cargo section */}
        <path
          d="M8 39h75v35H8z"
          fill="#D71920"
          stroke="#A90E17"
          strokeWidth="2"
        />

        <path
          d="M8 39h75v7H8z"
          fill="#F34A4F"
        />

        {/* Cabin */}
        <path
          d="M83 50h25l15 16v8H83z"
          fill="#D71920"
          stroke="#A90E17"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Window */}
        <path
          d="M89 54h16l10 11H89z"
          fill="#DDE6E8"
          stroke="#A90E17"
          strokeWidth="1.5"
        />

        {/* Bumper */}
        <path
          d="M8 74h115"
          stroke="#4A403A"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Wheels */}
        <circle cx="31" cy="76" r="9" fill="#37332F" />
        <circle cx="31" cy="76" r="4" fill="#D5D0C7" />

        <circle cx="101" cy="76" r="9" fill="#37332F" />
        <circle cx="101" cy="76" r="4" fill="#D5D0C7" />

        {/* Headlight */}
        <circle cx="120" cy="70" r="3" fill="#FFE49B" />
      </g>
    </svg>
  );
}

function PackageArtwork() {
  return (
    <svg
      viewBox="0 0 160 110"
      className="h-full w-full"
      fill="none"
      aria-hidden="true"
    >
      {/* Sparkles */}
      <path
        d="M30 30v12m-6-6h12"
        className={styles.sparkle}
        stroke="#D71920"
        strokeWidth="2"
        strokeLinecap="round"
      />

      <path
        d="M126 23v10m-5-5h10"
        className={styles.sparkleSecond}
        stroke="#D9A93E"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Package body */}
      <path
        d="M43 48 80 30l38 18v42L80 108 43 90V48Z"
        fill="#D9C5A9"
        stroke="#A98D6C"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      <path
        d="M43 48 80 66l38-18"
        stroke="#A98D6C"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      <path
        d="M80 66v42"
        stroke="#A98D6C"
        strokeWidth="2"
      />

      <path
        d="M69 37 106 55v42"
        stroke="#F5EBDD"
        strokeWidth="5"
        opacity=".8"
      />

      {/* Opening lid */}
      <g className={styles.packageLid}>
        <path
          d="m43 48 37-19 38 19-38 19-37-19Z"
          fill="#EAD9C3"
          stroke="#A98D6C"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

function SupportArtwork() {
  return (
    <svg
      viewBox="0 0 160 110"
      className="h-full w-full"
      fill="none"
      aria-hidden="true"
    >
      {/* Sound waves */}
      <path
        d="M34 42c-9 10-9 25 0 35"
        className={styles.soundWave}
        stroke="#D71920"
        strokeWidth="3"
        strokeLinecap="round"
      />

      <path
        d="M23 34c-15 16-15 35 0 52"
        className={styles.soundWaveSecond}
        stroke="#D71920"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Headset */}
      <path
        d="M48 67V51a32 32 0 0 1 64 0v16"
        stroke="#403A35"
        strokeWidth="8"
        strokeLinecap="round"
      />

      <rect
        x="42"
        y="60"
        width="18"
        height="29"
        rx="8"
        fill="#D71920"
      />

      <rect
        x="100"
        y="60"
        width="18"
        height="29"
        rx="8"
        fill="#D71920"
      />

      <path
        d="M109 84c0 12-10 15-23 15h-9"
        stroke="#403A35"
        strokeWidth="3"
        strokeLinecap="round"
      />

      <rect x="68" y="93" width="15" height="6" rx="3" fill="#403A35" />

      {/* Chat bubble */}
      <g className={styles.chatBubble}>
        <rect
          x="108"
          y="10"
          width="43"
          height="27"
          rx="9"
          fill="#FFFFFF"
          stroke="#D71920"
          strokeWidth="1.7"
        />

        <path
          d="m116 36 0 7 8-7"
          fill="#FFFFFF"
          stroke="#D71920"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />

        <circle cx="120" cy="23" r="2" fill="#D71920" />
        <circle cx="130" cy="23" r="2" fill="#D71920" />
        <circle cx="140" cy="23" r="2" fill="#D71920" />
      </g>
    </svg>
  );
}

function HomeArtwork() {
  return (
    <svg
      viewBox="0 0 160 110"
      className="h-full w-full"
      fill="none"
      aria-hidden="true"
    >
      {/* Roof */}
      <path
        d="m23 52 57-40 57 40"
        stroke="#403A35"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* House */}
      <path
        d="M35 48v51h90V48"
        fill="#EAD9C3"
        stroke="#B99F7D"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Door */}
      <path
        d="M69 72h22v27H69z"
        fill="#D71920"
        opacity=".9"
      />

      <circle cx="86" cy="85" r="1.8" fill="#FFF5E6" />

      {/* Windows */}
      <rect x="45" y="60" width="17" height="16" rx="2" fill="#FFFDF9" />
      <rect x="99" y="60" width="17" height="16" rx="2" fill="#FFFDF9" />

      {/* Heart */}
      <g className={styles.homeHeart}>
        <path
          d="M80 39c-13-15-31 3-15 17l15 13 15-13c16-14-2-32-15-17Z"
          fill="#D71920"
          stroke="#A90E17"
          strokeWidth="1.5"
        />
      </g>
    </svg>
  );
}

export default function AnimatedBenefitCards() {
  return (
    <section className="mx-auto max-w-[1440px] px-4 py-7 sm:px-7 sm:py-10 lg:px-12">
      <div className={styles.grid}>
        {benefits.map((benefit, index) => (
          <article
            key={benefit.number}
            className={styles.card}
            style={{
              animationDelay: `${index * -1.1}s`,
            }}
          >
            <div className={styles.artwork}>
              {benefit.artwork === "truck" ? (
                <TruckArtwork />
              ) : null}

              {benefit.artwork === "package" ? (
                <PackageArtwork />
              ) : null}

              {benefit.artwork === "support" ? (
                <SupportArtwork />
              ) : null}

              {benefit.artwork === "home" ? (
                <HomeArtwork />
              ) : null}
            </div>

            <div className={styles.content}>
              <span className={styles.number}>
                {benefit.number} / SERVICE
              </span>

              <h3>{benefit.title}</h3>

              <p>{benefit.description}</p>

              <span className={styles.detail}>
                <benefit.icon size={12} />
                <span>Oscar Trading</span>
                <ArrowUpRight size={12} />
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}