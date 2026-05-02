import * as React from "react";
import { cn } from "./utils";

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        // 玻璃底层
        "relative flex flex-col gap-6 rounded-2xl",
        "bg-card backdrop-blur-xl",
        // 描边：极细，半透明
        "border border-border/50",
        // 阴影：轻盈而有层次
        "shadow-[0_4px_24px_rgba(15,23,42,0.08),_0_1px_3px_rgba(15,23,42,0.04)]",
        // hover 效果
        "hover:border-primary/20",
        "hover:shadow-[0_8px_40px_rgba(15,23,42,0.12),_0_2px_6px_rgba(15,23,42,0.06)]",
        "transition-[border-color,box-shadow,background-color,transform] duration-250",
        "hover:-translate-y-0.5",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto]",
        "items-start gap-1.5 px-6 pt-6",
        "has-data-[slot=card-action]:grid-cols-[1fr_auto]",
        // 注意：移除了 [.border-b]:pb-6 — 不使用 border-b 作为分隔
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <h4
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6 [&:last-child]:pb-6", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      // 移除 [.border-t]:pt-6 — 不用 border-t 分隔
      className={cn("flex items-center px-6 pb-6", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
