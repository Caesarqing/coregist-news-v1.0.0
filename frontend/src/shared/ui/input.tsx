import * as React from "react";
import { cn } from "./utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // 基础布局
        "flex h-10 w-full min-w-0 rounded-lg px-3 py-2",
        "text-base md:text-sm",
        // 玻璃背景
        "bg-input-background backdrop-blur-sm",
        // 描边
        "border border-border/60",
        // 文字
        "text-foreground placeholder:text-muted-foreground/60",
        // 过渡
        "transition-[border-color,box-shadow,background-color] duration-200 outline-none",
        // Focus：AI 蓝光晕
        "focus-visible:border-primary/60",
        "focus-visible:shadow-[0_0_0_3px_rgba(37,99,235,0.15),_0_1px_4px_rgba(37,99,235,0.1)]",
        // 文件输入
        "file:text-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        // 禁用态
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        // 错误态
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
