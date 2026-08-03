"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function PatientError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="mx-auto grid max-w-lg gap-4 px-4 py-16">
      <Alert variant="destructive">
        <AlertTitle>Something went wrong</AlertTitle>
        <AlertDescription>
          Your appointments could not be loaded. Nothing has changed — try
          again.
        </AlertDescription>
      </Alert>
      <div>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
