import { AvailabilityState } from "@/components/finance/availability-state";
import { DateDisplay } from "@/components/finance/date-display";
import type { HouseholdProjection } from "@/lib/contracts/household-projection";

interface HouseholdOverviewProps {
  projection: HouseholdProjection;
}

/** Members and sources as released for this viewer. */
export function HouseholdOverview({ projection }: HouseholdOverviewProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section aria-labelledby="members-heading" className="space-y-3">
        <h2
          id="members-heading"
          className="text-primary text-xs font-semibold tracking-widest uppercase"
        >
          Household members
        </h2>
        <ul className="bg-card divide-y rounded-xl border">
          {projection.members.map((member) => (
            <li
              key={member.member_id}
              className="flex flex-wrap items-center justify-between gap-2 p-3"
            >
              <span className="font-medium">
                {member.display_label}
                {member.visibility === "self" && (
                  <span className="text-muted-foreground font-normal">
                    {" "}
                    (you)
                  </span>
                )}
              </span>
              {member.visibility === "not_shared" && (
                <AvailabilityState status="not_shared" compact />
              )}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="sources-heading" className="space-y-3">
        <h2
          id="sources-heading"
          className="text-primary text-xs font-semibold tracking-widest uppercase"
        >
          Sources
        </h2>
        <ul className="space-y-2">
          {projection.connections.map((connection) => (
            <li
              key={connection.connection_id}
              className="bg-card space-y-2 rounded-xl border p-3"
            >
              <p className="font-medium">{connection.label}</p>
              {connection.status === "connected" ? (
                <p className="text-muted-foreground text-sm">
                  Connected · updated{" "}
                  <DateDisplay value={connection.last_updated_at} />
                </p>
              ) : (
                <AvailabilityState status={connection.status} compact />
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
