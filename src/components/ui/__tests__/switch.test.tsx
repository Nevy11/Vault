import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Switch } from "../switch";
import React from "react";

describe("Switch component", () => {
  it("renders correctly", () => {
    render(<Switch data-testid="test-switch" />);
    const switchElement = screen.getByTestId("test-switch");
    expect(switchElement).toBeInTheDocument();
    expect(switchElement).toHaveClass("peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full");
  });

  it("can be disabled", () => {
    render(<Switch disabled data-testid="disabled-switch" />);
    const switchElement = screen.getByTestId("disabled-switch");
    expect(switchElement).toBeDisabled();
  });
});
