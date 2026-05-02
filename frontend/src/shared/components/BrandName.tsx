import React from 'react';

interface BrandNameProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function BrandName({ className = '', size = 'md' }: BrandNameProps) {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl'
  };

  return (
    <span className={`font-bold ${sizeClasses[size]} ${className}`}>
      <span className="text-primary">C</span>
      <span className="text-foreground">ore</span>
      <span className="text-primary">G</span>
      <span className="text-foreground">ist News</span>
    </span>
  );
}
