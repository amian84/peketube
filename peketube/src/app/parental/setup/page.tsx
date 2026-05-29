import { ParentalSetupGate } from "@/components/parental/parental-setup-wizard";

export default function ParentalSetupPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-10">
      <ParentalSetupGate />
    </main>
  );
}
