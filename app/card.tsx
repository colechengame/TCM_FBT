// Card.tsx
import React from 'react';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ title, children, className = '' }) => {
  // 這裡寫入你的元件實作
  return (
    <div className={className}>
      {title && <h2>{title}</h2>}
      {children}
    </div>
  );
};

export default Card;
    
