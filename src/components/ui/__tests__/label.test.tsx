import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Label } from "../label";
import React from "react";

describe("Label component", () => {
  it("renders correctly", () => {
    render(<Label htmlFor="test-input">Test Label</Label>);
    const label = screen.getByText("Test Label");
    expect(label).toBeInTheDocument();
    expect(label).toHaveClass("text-sm font-medium leading-none");
    expect(label).toHaveAttribute("for", "test-input");
  });
});
