import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const buttonVariants = cva(
  // 基础样式：圆角、字重、过渡、可访问性
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg",
    "text-sm font-semibold transition-all duration-200",
    "disabled:pointer-events-none disabled:opacity-40",
    "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0",
    "outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-1",
    "aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
  ].join(" "),
  {
    variants: {
      variant: {
        // Primary — AI 蓝发光 CTA，最重要的交互按钮
        default: [
          "bg-primary text-primary-foreground",
          "border border-primary/80",
          // 发光效果：静态 + hover 增强
          "shadow-[0_0_0_1px_rgba(37,99,235,0.25),_0_4px_20px_rgba(37,99,235,0.3),_0_1px_4px_rgba(0,0,0,0.1)]",
          "hover:shadow-[0_0_0_1px_rgba(37,99,235,0.4),_0_6px_28px_rgba(37,99,235,0.45),_0_2px_6px_rgba(0,0,0,0.12)]",
          "hover:brightness-[1.06]",
          "active:translate-y-[1px] active:shadow-none",
        ].join(" "),

        // Destructive — 红色警告操作
        destructive: [
          "bg-destructive text-destructive-foreground",
          "shadow-[0_2px_8px_rgba(220,38,38,0.25)]",
          "hover:brightness-95",
          "focus-visible:ring-destructive/20",
        ].join(" "),

        // Outline — 次级操作，轻描边
        outline: [
          "border border-border/80 bg-transparent text-foreground",
          "hover:bg-muted/50 hover:border-primary/30 hover:text-primary",
          "transition-colors",
        ].join(" "),

        // Secondary — 蓝色浅底
        secondary: [
          "bg-secondary text-secondary-foreground",
          "hover:brightness-95",
        ].join(" "),

        // Ghost — 无背景，轻 hover
        ghost: [
          "hover:bg-muted/60 hover:text-foreground",
        ].join(" "),

        // Link — 文字链接
        link: "text-primary underline-offset-4 hover:underline",

        // AI CTA — 特殊渐变版 primary，用于 Hero 区域主按钮
        "ai-cta": [
          "bg-gradient-to-r from-primary to-blue-500 text-white",
          "border border-primary/60",
          "shadow-[0_0_0_1px_rgba(37,99,235,0.3),_0_8px_32px_rgba(37,99,235,0.4)]",
          "hover:shadow-[0_0_0_1px_rgba(37,99,235,0.5),_0_12px_40px_rgba(37,99,235,0.5)]",
          "hover:brightness-[1.08]",
          "active:translate-y-[1px]",
        ].join(" "),
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3",
        sm:      "h-9 gap-1.5 px-3 has-[>svg]:px-2.5",
        lg:      "h-11 px-6 has-[>svg]:px-4 text-base",
        xl:      "h-13 px-8 has-[>svg]:px-5 text-base",
        icon:    "size-10",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
