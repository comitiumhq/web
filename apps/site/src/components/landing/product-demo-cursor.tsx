import type { CSSProperties } from 'react';
import './product-demo-cursor.css';

export function ProductDemoCursor({
  className,
  name,
  style,
}: {
  className: string;
  name?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`product-demo-cursor absolute size-[20px] pointer-events-none ${className}`}
      style={style}
      aria-hidden="true"
    >
      <svg className="product-demo-cursor-shape block size-full text-inherit" viewBox="0 0 20 20" fill="currentColor">
        <path d="M3 1.2 17.9 5.8c1.2.4 1.5 1.8.6 2.7L8.5 18.5c-.9.9-2.3.6-2.7-.6L1.2 3C.8 1.8 1.8.8 3 1.2Z" />
      </svg>
      {name && (
        <span className="product-demo-cursor-name absolute top-[13px] left-[25px] py-[5px] px-[9px] rounded-[7px] text-primary-foreground text-[10px] font-semibold leading-[14px] whitespace-nowrap">
          {name}
        </span>
      )}
    </div>
  );
}
