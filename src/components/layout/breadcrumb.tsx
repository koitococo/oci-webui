"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Fragment } from "react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="mb-4 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
      {items.map((item, i) => (
        <Fragment key={i}>
          {i > 0 && <ChevronRight className="h-3 w-3 shrink-0" />}
          {item.href ? (
            <Link
              href={item.href}
              className="min-w-0 max-w-full [overflow-wrap:anywhere] hover:text-foreground"
            >
              {item.label}
            </Link>
          ) : (
            <span className="min-w-0 max-w-full text-foreground [overflow-wrap:anywhere]">
              {item.label}
            </span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
