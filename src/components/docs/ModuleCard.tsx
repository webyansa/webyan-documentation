import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocModule } from "@/data/docsData";

type DocModuleWithStats = DocModule & {
  subModulesCount?: number;
  articlesCount?: number;
};

interface ModuleCardProps {
  module: DocModuleWithStats;
  className?: string;
}

function getIcon(iconName: string) {
  const IconComponent = (Icons as any)[iconName];
  return IconComponent || Icons.FileText;
}

export function ModuleCard({ module, className }: ModuleCardProps) {
  const IconComponent = getIcon(module.icon);

  const subModulesCount =
    typeof module.subModulesCount === "number"
      ? module.subModulesCount
      : module.subModules.length;

  const articlesCount =
    typeof module.articlesCount === "number"
      ? module.articlesCount
      : module.subModules.reduce((sum, sm) => sum + sm.articles.length, 0);

  return (
    <Link
      to={`/docs/${module.slug}`}
      className={cn("docs-card block p-6 group", className)}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "flex items-center justify-center w-12 h-12 rounded-xl transition-transform group-hover:scale-110",
            module.color === "primary" && "bg-primary/10 text-primary",
            module.color === "secondary" && "bg-secondary/20 text-secondary",
            module.color === "accent" && "bg-accent/20 text-accent"
          )}
        >
          <IconComponent className="h-6 w-6" />
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors mb-1">
            {module.title}
          </h3>
          <p className="text-sm text-muted-foreground mb-3">
            {module.description}
          </p>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {subModulesCount} قسم • {articlesCount} مقال
            </span>
            <ArrowLeft className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:-translate-x-1 transition-all" />
          </div>
        </div>
      </div>
    </Link>
  );
}
