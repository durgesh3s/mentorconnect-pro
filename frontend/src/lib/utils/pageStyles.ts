// Standard page styles - theme aware
export const pageStyles = {
  container: "min-h-screen bg-background text-foreground page-transition relative overflow-hidden",
  section: "relative py-20 px-4 z-10",
  card: "bg-card/50 backdrop-blur-md border border-border",
  button: {
    primary: "bg-foreground text-background hover:bg-foreground/90 border-2 border-foreground",
    outline: "border-2 border-foreground text-foreground hover:bg-foreground/10",
    ghost: "text-foreground hover:bg-foreground/10",
  },
  text: {
    primary: "text-foreground",
    secondary: "text-foreground/80",
    muted: "text-foreground/60",
  },
};

