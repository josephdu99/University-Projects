"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import type { ComponentProps } from "react";

export function SubmitButton({
  children,
  pendingLabel,
  variant,
  size,
  className,
  disabled,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  disabled?: boolean;
} & Pick<ComponentProps<typeof Button>, "variant" | "size" | "className">) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      className={className}
      disabled={disabled || pending}
    >
      {pending ? pendingLabel ?? "Working…" : children}
    </Button>
  );
}
