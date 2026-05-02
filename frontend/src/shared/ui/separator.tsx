"use client";

import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { cn } from "./utils";

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator-root"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0",
        orientation === "horizontal"
          ? [
              "h-px w-full",
              // 渐变淡出：两端透明，中间有描边色，整体透明度低
              "bg-gradient-to-r from-transparent via-border/40 to-transparent",
            ].join(" ")
          : "h-full w-px bg-border/30",
        className,
      )}
      {...props}
    />
  );
}

export { Separator };
