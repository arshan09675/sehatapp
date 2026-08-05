"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function PatientError({
  unstable_retry,
}: {
  error: Error;
  unstable_retry: () => void;
}) {
  return (
    <div className="mx-auto grid max-w-lg gap-4 px-4 py-16">
      <Alert variant="destructive">
        <AlertTitle>Your appointments could not be loaded</AlertTitle>
        <AlertDescription>Nothing has changed — try again.</AlertDescription>
      </Alert>
      <div>
        <Button onClick={() => unstable_retry()}>Try again</Button>
      </div>
    </div>
  );
}
