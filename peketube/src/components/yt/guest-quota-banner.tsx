import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

/** Cuota diaria del proyecto agotada en modo invitado. */
export function GuestQuotaBanner({ className }: Props) {
  return (
    <div
      className={
        className ??
        "mx-2 mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-3 text-sm text-amber-100"
      }
    >
      <p className="font-medium">Cuota de invitado agotada</p>
      <p className="mt-1 text-amber-200/90">
        No podemos procesar más búsquedas en modo invitado hasta mañana (reinicio
        diario de la cuota de Google). Para seguir ahora, conecta tu cuenta de
        Google y usa tu propia cuota.
      </p>
      <Link
        href="/sign-in"
        className={cn(buttonVariants({ size: "sm" }), "mt-3 inline-flex")}
      >
        Conectar con Google
      </Link>
    </div>
  );
}
