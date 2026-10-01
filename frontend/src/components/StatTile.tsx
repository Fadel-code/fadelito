import type { ComponentType } from "react";

const COLOR_CLASS: Record<string, string> = {
  gray: "text-gray-500",
  green: "text-green-500",
  blue: "text-blue-500",
  amber: "text-amber-500",
  orange: "text-orange-500",
  red: "text-red-500",
  cyan: "text-cyan-500",
};

const VALUE_COLOR_CLASS: Record<string, string> = {
  gray: "text-gray-800",
  green: "text-green-600",
  blue: "text-blue-700",
  amber: "text-amber-700",
  orange: "text-orange-700",
  red: "text-red-600",
  cyan: "text-cyan-700",
};

interface Props {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  color?: keyof typeof COLOR_CLASS;
}

export default function StatTile({ icon: Icon, label, value, color = "gray" }: Props) {
  return (
    <div>
      <div className={`flex items-center gap-1.5 ${COLOR_CLASS[color]}`}>
        <Icon className="h-3.5 w-3.5" />
        <p className="text-xs font-medium text-gray-700">{label}</p>
      </div>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${VALUE_COLOR_CLASS[color]}`}>{value}</p>
    </div>
  );
}
