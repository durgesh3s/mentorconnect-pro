// Utility to update all pages with black/white theme
// This file is for reference - actual updates done via search_replace

export const buttonStyles = {
  primary: "bg-foreground text-background hover:bg-foreground/90 border-2 border-foreground",
  outline: "border-2 border-foreground text-white hover:bg-foreground/10",
  ghost: "text-white hover:bg-foreground/10",
};

export const textStyles = {
  primary: "text-foreground",
  secondary: "text-foreground/80",
  muted: "text-foreground/60",
};

export const cardStyles = "bg-card/50 backdrop-blur-md border-border";

export const pageContainer = "min-h-screen bg-background text-foreground page-transition";

