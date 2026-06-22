import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from "../card";
import React from "react";

describe("Card component", () => {
  it("renders the card structure correctly", () => {
    render(
      <Card data-testid="card">
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card Description</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Card Content</p>
        </CardContent>
        <CardFooter>
          <button>Card Footer Button</button>
        </CardFooter>
      </Card>
    );

    const card = screen.getByTestId("card");
    expect(card).not.toBeNull();
    expect(card.className).toContain("rounded-xl");

    expect(screen.getByText("Card Title")).not.toBeNull();
    expect(screen.getByText("Card Description")).not.toBeNull();
    expect(screen.getByText("Card Content")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Card Footer Button" })).not.toBeNull();
  });
});
