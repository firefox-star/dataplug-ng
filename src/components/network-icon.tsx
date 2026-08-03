'use client';

import Image from 'next/image';

interface NetworkIconProps {
  slug: string;
  name: string;
  size?: number;
  className?: string;
}

export function NetworkIcon({ slug, name, size = 48, className }: NetworkIconProps) {
  const displayName = name || slug || 'Network';
  return (
    <div className={className} style={{ width: size, height: size, flexShrink: 0 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/logos/${slug}.png`}
        alt={`${displayName} logo`}
        width={size}
        height={size}
        style={{ width: size, height: size, objectFit: 'contain', borderRadius: '50%' }}
        onError={(e) => { const target = e.currentTarget; target.style.display = 'none'; }}
      />
    </div>
  );
}
