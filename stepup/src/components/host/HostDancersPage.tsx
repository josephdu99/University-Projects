import { C, DISPLAY } from "@/lib/marketing-theme";
import { getHostDancers } from "@/lib/host-data";
import { avatarHue, initialsOf } from "@/lib/style-chips";
import { formatClassWhen } from "@/lib/time";

/**
 * Everyone who has booked or attended one of this host's classes.
 *
 * Read-only on purpose: the dashboard's insight card points here, but there is
 * no way to contact this list from inside StepUp yet, so the page does not
 * pretend to offer one.
 */
export async function HostDancersPage({ hostId }: { hostId: string }) {
  const dancers = await getHostDancers(hostId);
  const regulars = dancers.filter((d) => d.classesTaken > 1).length;

  return (
    <>
      <h1
        style={{
          fontFamily: DISPLAY,
          fontWeight: 800,
          fontSize: "clamp(28px, 4vw, 36px)",
          letterSpacing: "-0.02em",
          margin: "0 0 6px",
        }}
      >
        Dancers
      </h1>
      <p style={{ fontSize: 15, color: C.label, margin: "0 0 28px" }}>
        {dancers.length === 0
          ? "Nobody has taken one of your classes yet."
          : `${dancers.length} ${dancers.length === 1 ? "person has" : "people have"} taken a class with you` +
            (regulars > 0 ? ` · ${regulars} came back for more` : "")}
      </p>

      {dancers.length > 0 && (
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 24,
            overflow: "hidden",
          }}
        >
          {dancers.map((d, i) => {
            const hue = avatarHue(d.id);
            return (
              <div
                key={d.id}
                className="stepup-row"
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 16,
                  padding: "18px clamp(16px, 2.5vw, 26px)",
                  borderTop: i === 0 ? undefined : `1px solid ${C.rowDivider}`,
                  transition: "background 0.15s ease",
                }}
              >
                <div
                  aria-hidden
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 999,
                    background: `oklch(89% 0.055 ${hue})`,
                    color: `oklch(38% 0.09 ${hue})`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: DISPLAY,
                    fontWeight: 700,
                    fontSize: 14,
                    flex: "none",
                  }}
                >
                  {initialsOf(d.name)}
                </div>

                <div style={{ flex: "1 1 200px", minWidth: 160 }}>
                  <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 16 }}>
                    {d.name}
                  </div>
                  <div style={{ fontSize: 13.5, color: C.meta }}>
                    {d.homeCity ? `${d.homeCity} · ` : ""}
                    last with you at {d.lastClass.title},{" "}
                    {formatClassWhen(d.lastClass.startTime, d.lastClass.timezone)}
                  </div>
                </div>

                <div style={{ flex: "none", textAlign: "right", minWidth: 110 }}>
                  <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 17 }}>
                    {d.classesTaken}
                  </div>
                  <div style={{ fontSize: 12.5, color: C.label }}>
                    {d.classesTaken === 1 ? "class booked" : "classes booked"}
                    {d.attended > 0 ? ` · ${d.attended} attended` : ""}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
