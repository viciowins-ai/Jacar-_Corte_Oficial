import React, { useState } from 'react';

export interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string | null;
  fallbackSrc?: string;
  type?: 'user' | 'barber' | 'service';
}

export function ImageWithFallback({
  src,
  fallbackSrc,
  type = 'user',
  alt = '',
  className = '',
  ...props
}: ImageWithFallbackProps) {
  const [hasError, setHasError] = useState(false);

  const getDefaultFallback = () => {
    if (type === 'barber') {
      return '/logo_jacare_final.jpg';
    }
    if (type === 'service') {
      return '/logo_jacare_final.jpg';
    }
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(alt || 'User')}`;
  };

  const effectiveFallback = fallbackSrc || getDefaultFallback();
  const imageSource = (!src || hasError) ? effectiveFallback : src;

  return (
    <img
      src={imageSource}
      alt={alt}
      className={className}
      onError={() => {
        if (!hasError) {
          setHasError(true);
        }
      }}
      {...props}
    />
  );
}
