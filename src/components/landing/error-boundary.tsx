"use client";

import { Component, type ReactNode } from "react";

/**
 * Local error boundary for pieces of the landing that must not be able to take
 * the whole page down with them.
 *
 * The route already has src/app/(public)/error.tsx, but that boundary sits
 * above the page: anything reaching it replaces the entire landing, hero and
 * all. A doctor search that fails should cost the visitor the doctor list, not
 * the page they were looking at.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode; label: string },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    // Nothing here is worth interrupting a visitor over, but swallowing it
    // silently is what makes the next "it just doesn't show up sometimes"
    // report impossible to act on.
    console.error(`[${this.props.label}] render failed`, error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
