import type { ReactNode } from "react";

interface FeatureCardProps {
  eyebrow?: string;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function FeatureCard({ eyebrow, title, children, footer }: FeatureCardProps) {
  return (
    <section className="feature-card">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2 className="card-title">{title}</h2>
      <div className="card-body">{children}</div>
      {footer && <div className="card-footer">{footer}</div>}
    </section>
  );
}
