import { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export function DashboardGrid({ children }: Props) {
  return (
    <div
      className="
        grid
        gap-5
        md:grid-cols-2
        xl:grid-cols-3
      "
    >
      {children}
    </div>
  );
}
