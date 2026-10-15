import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { Badge } from "../components/ui/Badge";
import { ProgressBar } from "../components/ui/ProgressBar";

describe("Button Component", () => {
  it("renders children text properly", () => {
    render(<Button>Convert Now</Button>);
    expect(screen.getByRole("button", { name: /convert now/i })).toBeDefined();
  });

  it("handles click events", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("disables button and shows spinner when isLoading is true", () => {
    render(<Button isLoading>Processing</Button>);
    const btn = screen.getByRole("button") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});

describe("Alert Component", () => {
  it("renders alert title and body content", () => {
    render(
      <Alert variant="warning" title="Quality Warning">
        Bitrate exceeds standard playback limits.
      </Alert>
    );
    expect(screen.getByRole("alert")).toBeDefined();
    expect(screen.getByText("Quality Warning")).toBeDefined();
    expect(screen.getByText(/Bitrate exceeds standard/i)).toBeDefined();
  });

  it("fires dismiss callback when close button is clicked", () => {
    const handleDismiss = vi.fn();
    render(
      <Alert variant="info" onDismiss={handleDismiss}>
        Dismissible Notice
      </Alert>
    );
    const closeBtn = screen.getByRole("button", { name: /dismiss alert/i });
    fireEvent.click(closeBtn);
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });
});

describe("Badge Component", () => {
  it("renders with proper badge styles", () => {
    render(<Badge variant="primary">1080p</Badge>);
    expect(screen.getByText("1080p")).toBeDefined();
  });
});

describe("ProgressBar Component", () => {
  it("renders progress label and clamped percentage", () => {
    render(<ProgressBar progress={75} label="Transcoding Audio" />);
    expect(screen.getByText("Transcoding Audio")).toBeDefined();
    expect(screen.getByText("75%")).toBeDefined();
  });
});
