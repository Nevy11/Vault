import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Textarea } from "../textarea";
import React from "react";

describe("Textarea component", () => {
  it("renders correctly", () => {
    render(<Textarea placeholder="Enter your message" />);
    const textarea = screen.getByPlaceholderText("Enter your message");
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveClass("flex min-h-[60px] w-full rounded-md border");
  });

  it("can be disabled", () => {
    render(<Textarea disabled placeholder="Disabled textarea" />);
    const textarea = screen.getByPlaceholderText("Disabled textarea");
    expect(textarea).toBeDisabled();
  });
});
