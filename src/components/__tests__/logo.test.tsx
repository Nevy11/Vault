import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import React from "react";
import { Logo } from "../logo";

describe("Logo component", () => {
  it("renders the Vault brand and V logo", () => {
    render(<Logo to="/dashboard" />);

    expect(screen.getByText("Vault")).toBeInTheDocument();
    expect(screen.getByText("V")).toBeInTheDocument();
  });
});
