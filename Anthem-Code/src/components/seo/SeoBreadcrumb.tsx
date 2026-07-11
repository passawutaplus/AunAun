import { Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";
import type { BreadcrumbItem as SeoCrumb } from "@/lib/seoSchemas";

type Props = {
  items: SeoCrumb[];
  className?: string;
};

/** Visible breadcrumb nav — pair with breadcrumbJsonLd in SeoHead. */
const SeoBreadcrumb = ({ items, className }: Props) => {
  if (items.length < 2) return null;

  return (
    <Breadcrumb className={cn("mb-3", className)}>
      <BreadcrumbList>
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <BreadcrumbItem key={`${item.path}-${i}`}>
              {i > 0 && <BreadcrumbSeparator />}
              {last ? (
                <BreadcrumbPage className="thai-body line-clamp-1 max-w-[14rem] sm:max-w-xs">
                  {item.name}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={item.path} className="thai-body">
                    {item.name}
                  </Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export default SeoBreadcrumb;
