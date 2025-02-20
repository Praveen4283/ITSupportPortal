import { Building2 } from "lucide-react";

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-8 w-8 text-primary" />
      <span className="text-2xl font-bold">IT Support Portal</span>
    </div>
  );
}
