import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          warning:
            "group-[.toast]:bg-amber-50 group-[.toast]:border-amber-200 group-[.toast]:text-amber-950",
          error:
            "group-[.toast]:bg-red-50 group-[.toast]:border-red-200 group-[.toast]:text-red-950",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
