import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Skeleton } from "../skeleton";
import React from "react";

describe("Skeleton component", () => {
  it("renders correctly", () => {
    const { container } = render(<Skeleton className="w-[100px] h-[20px]" />);
    const skeleton = container.firstChild as HTMLElement;
    
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass("animate-pulse rounded-md bg-primary/10");
    expect(skeleton).toHaveClass("w-[100px]");
    expect(skeleton).toHaveClass("h-[20px]");
  });
});
