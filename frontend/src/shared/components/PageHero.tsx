import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { cn } from '~/shared/ui/utils';

interface PageHeroProps {
  title: string;
  description: string;
  icon: LucideIcon;
  gradientClassName?: string;
  descriptionClassName?: string;
}

export function PageHero({
  title,
  description,
  icon: Icon,
  gradientClassName,
  descriptionClassName = 'text-muted-foreground',
}: PageHeroProps) {
  return (
    // 移除 border-b，改用底部渐变 + 极轻背景
    <div className="relative bg-background overflow-hidden">
      {/* 右上角 AI 蓝光晕装饰（极淡，仅 dark mode 明显） */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-12 right-0 h-40 w-64
                   bg-gradient-to-bl from-primary/8 via-primary/3 to-transparent
                   dark:from-primary/12 dark:via-primary/5 rounded-full blur-2xl"
      />
      {/* 底部渐变淡出替代 border-b */}
      <div
        aria-hidden
        className="absolute bottom-0 left-0 right-0 h-px
                   bg-gradient-to-r from-transparent via-border/30 to-transparent"
      />

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative z-10 mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8"
      >
        <div className="flex items-start gap-3">
          {/* Icon 容器：AI 蓝背景 */}
          <div className="flex items-center justify-center w-10 h-10 rounded-xl
                          bg-primary/10 text-primary shrink-0
                          shadow-[0_0_0_1px_rgba(37,99,235,0.15)]">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl text-foreground">
              {title}
            </h1>
            <p className={cn(
              'mt-1 max-w-3xl text-sm leading-6 sm:text-base sm:leading-7',
              descriptionClassName
            )}>
              {description}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
