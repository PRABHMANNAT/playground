"use client";

import * as React from "react";
import { Avatar as AvatarPrimitive } from "radix-ui";

function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function Avatar({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={classes(
        "relative inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-white/80 bg-white shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={classes(
        "absolute inset-0 size-full rounded-full object-cover",
        className,
      )}
      {...props}
    />
  );
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={classes(
        "flex size-full items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700",
        className,
      )}
      {...props}
    />
  );
}

function AvatarBadge({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar-badge"
      className={classes(
        "absolute right-0 bottom-0 z-10 size-2.5 rounded-full border-2 border-white bg-emerald-600",
        className,
      )}
      {...props}
    />
  );
}

function AvatarGroup({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group"
      className={classes("flex -space-x-2 *:ring-2 *:ring-white", className)}
      {...props}
    />
  );
}

function AvatarGroupCount({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar-group-count"
      className={classes(
        "relative flex size-10 shrink-0 items-center justify-center rounded-full border border-white bg-slate-900 text-xs font-bold text-white ring-2 ring-white",
        className,
      )}
      {...props}
    />
  );
}

export {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
};
