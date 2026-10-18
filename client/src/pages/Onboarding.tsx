import { useState } from "react";
import type { Nation } from "@shared/types";
import { Logo } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Segmented } from "@/components/ui/misc";
import { useUpdateProfile } from "@/lib/queries";

export default function Onboarding() {
  const update = useUpdateProfile();
  const [name, setName] = useState("");
  const [nation, setNation] = useState<Nation>("england");

  return (
    <div className="mx-auto max-w-xl py-6 animate-rise">
      <Logo className="mb-8" />
      <h1 className="text-3xl font-bold">Let's get you ready for your theory test</h1>
      <p className="mt-3 text-muted">
        Lessons, practice questions, timed mock tests, hazard perception and road signs, all running on your own server. Your progress is saved as you go.
      </p>

      <Card className="mt-8">
        <CardContent className="space-y-6 pt-5">
          <div className="space-y-2">
            <Label htmlFor="name">What should we call you?</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="First name" autoComplete="given-name" maxLength={60} />
          </div>
          <div className="space-y-2">
            <Label id="nation-label">Where will you mostly be driving?</Label>
            <p className="text-sm text-muted">The test covers the whole of Great Britain. This just highlights the rules that differ where you live, like the 20 mph default in Wales.</p>
            <Segmented<Nation>
              label="Nation"
              value={nation}
              onChange={setNation}
              options={[
                { value: "england", label: "England" },
                { value: "scotland", label: "Scotland" },
                { value: "wales", label: "Wales" },
              ]}
            />
          </div>
          <Button size="lg" className="w-full" disabled={update.isPending} onClick={() => update.mutate({ name: name.trim(), nation, onboarded: true })}>
            Start learning
          </Button>
          {update.isError && <p className="text-sm text-danger">{(update.error as Error).message}</p>}
        </CardContent>
      </Card>

      <p className="mt-6 text-xs leading-relaxed text-muted">
        This is an independent practice tool for the GB car theory test. It isn't affiliated with or endorsed by DVSA, and the questions are original ones written for practice, not official DVSA revision questions.
      </p>
    </div>
  );
}
