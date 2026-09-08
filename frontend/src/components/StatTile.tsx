import type { ComponentType } from "react";

const COLOR_CLASS: Record<string, string> = {
  gray: "text-gray-400",
  green: "text-green-500",
  blue: "text-blue-500",
  amber: "text-amber-500",
  orange: "text-orange-500",
  red: "text-red-500",
};

const VALUE_COLOR_CLASS: Record<string, string> = {
  gray: "text-gray-800",
  green: "text-green-600",
  blue: "text-blue-500",
  amber: "text-amber-500",
  orange: "text-orange-500",
  red: "text-red-500",
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
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
      </div>
      <p className={`text-2xl font-bold mt-1 ${VALUE_COLOR_CLASS[color]}`}>{value}</p>
    </div>
  );
}
