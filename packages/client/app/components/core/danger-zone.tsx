import { FieldLegend, FieldSet } from "~/ui/components/field";

export const DangerZone = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <FieldSet className="mt-14 border border-destructive/40 p-4">
    <FieldLegend>{label}</FieldLegend>

    {children}
  </FieldSet>
);
