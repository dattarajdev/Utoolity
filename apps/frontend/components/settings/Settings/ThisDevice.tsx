import ThisSiteAsAnApp from "./ThisDevice/ThisSiteAsAnApp";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@repo/ui/shadcn/card";

const timerOptions = [
  { label: "1 minute", value: 1 },
  { label: "2 minutes", value: 2 },
  { label: "5 minutes", value: 5 },
  { label: "10 minutes", value: 10 },
  { label: "15 minutes", value: 15 },
  { label: "30 minutes", value: 30 },
];
const warningOptions = [
  { label: "Off", value: 0 },
  { label: "15 seconds", value: 15 },
  { label: "30 seconds", value: 30 },
  { label: "1 minute", value: 60 },
];
const SETTINGS_EVENT = "utoolity:inactivity-settings-changed";

export default function ThisDevice() {
  const [sleepAfter, setSleepAfter] = useState(5);
  const [warningBefore, setWarningBefore] = useState(30);
  const [lockAfter, setLockAfter] = useState(2);

  useEffect(() => {
    const read = (key: string, fallback: number) => {
      const stored = localStorage.getItem(key);
      return stored === null ? fallback : Number(stored);
    };
    setSleepAfter(read("utoolity.sleep-after-ms", 5 * 60_000) / 60_000);
    setWarningBefore(read("utoolity.sleep-warning-before-ms", 30_000) / 1000);
    setLockAfter(read("utoolity.lock-after-sleep-ms", 2 * 60_000) / 60_000);
  }, []);

  const saveSetting = (key: string, value: number) => {
    localStorage.setItem(key, String(value));
    window.dispatchEvent(new CustomEvent(SETTINGS_EVENT));
  };

  return (
    <div className="space-y-2.5">
      <h2 className="text-base font-bold tracking-tight">This device</h2>
      <Card>
        <CardContent className="space-y-4 p-3.5">
          <div>
            <h3 className="text-sm font-semibold">Power & inactivity</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Automatically sleep after inactivity, then lock the device.
              Mouse, keyboard, touch and scrolling activity reset the timer.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-1.5 text-xs font-medium">
              Sleep after
              <select value={sleepAfter} onChange={(event) => {
                const value = Number(event.target.value);
                setSleepAfter(value);
                saveSetting("utoolity.sleep-after-ms", value * 60_000);
              }} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm font-normal text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/30">
                {timerOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="space-y-1.5 text-xs font-medium">
              Warning before sleep
              <select value={warningBefore} onChange={(event) => {
                const value = Number(event.target.value);
                setWarningBefore(value);
                saveSetting("utoolity.sleep-warning-before-ms", value * 1000);
              }} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm font-normal text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/30">
                {warningOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="space-y-1.5 text-xs font-medium">
              Lock after sleep
              <select value={lockAfter} onChange={(event) => {
                const value = Number(event.target.value);
                setLockAfter(value);
                saveSetting("utoolity.lock-after-sleep-ms", value * 60_000);
              }} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm font-normal text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/30">
                {timerOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          </div>
        </CardContent>
      </Card>
      <ThisSiteAsAnApp />
    </div>
  );
}
