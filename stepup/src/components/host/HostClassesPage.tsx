import Link from "next/link";
import { C, DISPLAY } from "@/lib/marketing-theme";
import { getHostDashboard } from "@/lib/host-data";
import { ClassRowList } from "./ClassRow";

/**
 * The full class list behind the "Classes" nav item. The dashboard shows a
 * trimmed view; this is everything, newest past first.
 */
export async function HostClassesPage({
  hostId,
  base,
}: {
  hostId: string;
  base: "/studio";
}) {
  const { upcoming, past, hostedCount } = await getHostDashboard(hostId);

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 28,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: DISPLAY,
              fontWeight: 800,
              fontSize: "clamp(28px, 4vw, 36px)",
              letterSpacing: "-0.02em",
              margin: "0 0 6px",
            }}
          >
            Classes
          </h1>
          <p style={{ fontSize: 15, color: C.label, margin: 0 }}>
            {hostedCount} hosted all time · {upcoming.length} still to come
          </p>
        </div>
        <Link
          href={`${base}/classes/new`}
          style={{
            fontWeight: 700,
            fontSize: 15,
            padding: "13px 24px",
            borderRadius: 999,
            background: C.brand,
            color: C.onBrand,
            textDecoration: "none",
          }}
        >
          Create a class
        </Link>
      </div>

      <h2
        style={{
          fontFamily: DISPLAY,
          fontWeight: 800,
          fontSize: 22,
          letterSpacing: "-0.02em",
          margin: "0 0 16px",
        }}
      >
        Upcoming
      </h2>
      {upcoming.length === 0 ? (
        <EmptyNote>Nothing on the calendar yet.</EmptyNote>
      ) : (
        <ClassRowList classes={upcoming} base={base} action="manage" />
      )}

      <h2
        style={{
          fontFamily: DISPLAY,
          fontWeight: 800,
          fontSize: 22,
          letterSpacing: "-0.02em",
          margin: "44px 0 16px",
        }}
      >
        Past
      </h2>
      {past.length === 0 ? (
        <EmptyNote>No classes have run yet.</EmptyNote>
      ) : (
        <ClassRowList classes={past} base={base} action="runAgain" />
      )}
    </>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        background: C.card,
        border: `1.5px dashed ${C.dashed}`,
        borderRadius: 24,
        padding: "32px 24px",
        textAlign: "center",
        fontSize: 15,
        color: C.label,
        margin: 0,
      }}
    >
      {children}
    </p>
  );
}
