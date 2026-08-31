import logos from "@/lib/logos.json";

interface LogoEntry {
  id: string;
  name: string;
  file: string;
  source: string;
}

const ALL = logos as LogoEntry[];

function Row({ items, reverse }: { items: LogoEntry[]; reverse?: boolean }) {
  return (
    <div className="marquee-row relative overflow-hidden">
      <div
        className={`marquee-track flex w-max items-center gap-10 pr-10 ${
          reverse ? "marquee-reverse" : ""
        }`}
      >
        {/* 무한 롤링을 위해 트랙을 2회 반복 */}
        {[0, 1].map((copy) => (
          <div
            key={copy}
            aria-hidden={copy === 1}
            className="flex items-center gap-10"
          >
            {items.map((logo) => (
              <div
                key={`${copy}-${logo.id}`}
                className="flex h-16 w-36 shrink-0 items-center justify-center"
                title={logo.name}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/logos/${logo.file}`}
                  alt={logo.name}
                  className="max-h-9 max-w-32 object-contain opacity-75 grayscale transition duration-300 hover:opacity-100 hover:grayscale-0"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LogoMarquee() {
  const half = Math.ceil(ALL.length / 2);
  const rowA = ALL.slice(0, half);
  const rowB = ALL.slice(half);

  return (
    <div className="relative space-y-6">
      <Row items={rowA} />
      {rowB.length > 0 && <Row items={rowB} reverse />}
      {/* 양끝 페이드 */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-white to-transparent" />
    </div>
  );
}

export const LOGO_COUNT = ALL.length;
