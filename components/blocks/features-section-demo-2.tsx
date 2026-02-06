import { cn } from "@/lib/utils";
import {
  IconBuilding,
  IconCoin,
  IconChartPie,
  IconShieldCheck,
} from "@tabler/icons-react";

export default function FeaturesSectionDemo() {
  const features = [
    {
      title: "Real-World Assets",
      description: "Tokenize real estate, gold, art, and more on-chain",
      icon: <IconBuilding className="w-8 h-8" />,
    },
    {
      title: "Fractional Ownership",
      description: "Buy and sell fractions of high-value assets instantly",
      icon: <IconChartPie className="w-8 h-8" />,
    },
    {
      title: "Instant Settlement",
      description: "Powered by Solana for sub-second transactions",
      icon: <IconCoin className="w-8 h-8" />,
    },
    {
      title: "Verified Assets",
      description: "Document verification ensures asset authenticity",
      icon: <IconShieldCheck className="w-8 h-8" />,
    },
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4  relative z-10 py-10 max-w-7xl mx-auto">
      {features.map((feature, index) => (
        <Feature key={feature.title} {...feature} index={index} />
      ))}
    </div>
  );
}

const Feature = ({
  title,
  description,
  icon,
  index,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  index: number;
}) => {
  return (
    <div
      className={cn(
        "flex flex-col lg:border-r py-10 relative group/feature border-zinc-800",
        (index === 0 || index === 4) && "lg:border-l border-zinc-800",
        index < 4 && "lg:border-b border-zinc-800"
      )}
    >
      {index < 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-t from-blue-500/20 to-transparent pointer-events-none" />
      )}
      {index >= 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-b from-blue-500/20 to-transparent pointer-events-none" />
      )}
      <div className="mb-4 relative z-10 px-10 text-blue-400 [&>svg]:w-8 [&>svg]:h-8">
        {icon}
      </div>
      <div className="text-lg font-bold mb-2 relative z-10 px-10">
        <div className="absolute left-0 inset-y-0 h-6 group-hover/feature:h-8 w-1 rounded-tr-full rounded-br-full bg-zinc-700 group-hover/feature:bg-blue-500 transition-all duration-200 origin-center" />
        <span className="group-hover/feature:translate-x-2 transition duration-200 inline-block text-white">
          {title}
        </span>
      </div>
      <p className="text-sm text-zinc-300 max-w-xs relative z-10 px-10">
        {description}
      </p>
    </div>
  );
};