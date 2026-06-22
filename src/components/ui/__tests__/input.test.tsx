import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Input } from "../input";
import React from "react";

describe("Input component", () => {
  it("renders correctly", () => {
    render(<Input placeholder="Enter text here" />);
    const input = screen.getByPlaceholderText("Enter text here");
    expect(input).not.toBeNull();
    expect(input.className).toContain("flex h-9 w-full rounded-md border");
  });

  it("can be disabled", () => {
    render(<Input disabled placeholder="Disabled input" />);
    const input = screen.getByPlaceholderText("Disabled input");
    expect(input.hasAttribute("disabled")).toBe(true);
  });
});
