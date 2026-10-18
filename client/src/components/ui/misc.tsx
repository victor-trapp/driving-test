import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as LabelPrimitive from "@radix-ui/react-label";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// ---- Badge ---------------------------------------------------------------------------

const badgeVariants = cva("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold [&_svg]:size-3.5", {
  variants: {
    variant: {
      default: "bg-surface-2 text-foreground",
      primary: "bg-primary-soft text-primary",
      success: "bg-success-soft text-success",
      danger: "bg-danger-soft text-danger",
      warning: "bg-warning-soft text-warning",
      accent: "bg-accent text-accent-foreground",
      outline: "border border-border-strong text-muted",
    },
  },
  defaultVariants: { variant: "default" },
});

export function Badge({ className, variant, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

// ---- Progress ------------------------------------------------------------------------

export function Progress({ value, className, indicatorClassName, label }: { value: number; className?: string; indicatorClassName?: string; label?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <ProgressPrimitive.Root value={v} aria-label={label} className={cn("relative h-2 w-full overflow-hidden rounded-full bg-surface-3", className)}>
      <ProgressPrimitive.Indicator className={cn("h-full rounded-full bg-primary transition-[width] duration-500", indicatorClassName)} style={{ width: `${v}%` }} />
    </ProgressPrimitive.Root>
  );
}

// ---- Switch ----------------------------------------------------------------------------

export const Switch = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-surface-3 transition-colors data-[state=checked]:bg-primary disabled:opacity-50",
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb className="pointer-events-none block size-5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-5" />
  </SwitchPrimitive.Root>
));
Switch.displayName = "Switch";

// ---- Label and Input --------------------------------------------------------------------

export const Label = React.forwardRef<HTMLLabelElement, React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn("text-sm font-semibold", className)} {...props} />
));
Label.displayName = "Label";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-10 w-full rounded-lg border border-border-strong bg-surface px-3 text-[15px] placeholder:text-muted focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

// ---- Tabs ------------------------------------------------------------------------------

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List className={cn("inline-flex max-w-full gap-1 overflow-x-auto rounded-lg bg-surface-2 p-1", className)} {...props} />;
}

export function TabsTrigger({ className, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "inline-flex h-8 shrink-0 cursor-pointer items-center justify-center rounded-md px-3 text-sm font-semibold text-muted transition-colors hover:text-foreground data-[state=active]:bg-surface data-[state=active]:text-foreground data-[state=active]:shadow-card",
        className,
      )}
      {...props}
    />
  );
}

export const TabsContent = TabsPrimitive.Content;

// ---- Skeleton ----------------------------------------------------------------------------

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-surface-2", className)} />;
}

// ---- Segmented choice (radio group styled as buttons) -------------------------------------

export function Segmented<T extends string | number>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode }[];
  label: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex flex-wrap gap-1 rounded-lg bg-surface-2 p-1", className)}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-9 min-w-12 cursor-pointer rounded-md px-3 text-sm font-semibold transition-colors",
            o.value === value ? "bg-surface text-foreground shadow-card" : "text-muted hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
