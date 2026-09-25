import { AvailabilityState } from "@/components/finance/availability-state";
import { getAppArea, type AppAreaId } from "@/lib/navigation";

interface AreaPlaceholderProps {
  areaId: AppAreaId;
}

/** Honest "not built yet" screen for areas delivered by later tasks. */
export function AreaPlaceholder({ areaId }: AreaPlaceholderProps) {
  const area = getAppArea(areaId);
  const Icon = area.icon;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-heading flex items-center gap-2 text-3xl tracking-tight">
          <Icon aria-hidden className="text-primary size-6" />
          {area.title}
        </h1>
        <p className="text-muted-foreground max-w-prose">{area.summary}</p>
      </header>
      <AvailabilityState
        status="unavailable"
        title="Not available in this build yet"
        description="This part of DhanYukti is not connected yet. An empty screen here does not mean you have nothing to see."
      />
    </div>
  );
}
