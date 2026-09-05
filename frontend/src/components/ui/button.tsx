import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/20 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer select-none",
  {
    variants: {
      variant: {
        default: "bg-slate-950 text-white hover:bg-red-600 hover:shadow-lg hover:shadow-red-600/25 active:bg-red-700 border border-slate-900 hover:border-red-600",
        destructive:
          "bg-red-600 text-white hover:bg-red-700 hover:shadow-lg hover:shadow-red-600/30 border border-red-600",
        outline:
          "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100/80 hover:text-slate-950 hover:border-slate-300 hover:shadow-md hover:shadow-slate-950/5",
        secondary:
          "bg-slate-100 text-slate-900 hover:bg-slate-200/80 hover:shadow-sm",
        ghost: "hover:bg-slate-100 hover:text-slate-950 hover:scale-[1.02]",
        link: "text-red-600 underline-offset-4 hover:underline hover:text-red-700",
      },
      size: {
        default: "h-10 px-4 py-2 text-sm font-semibold",
        sm: "h-9 rounded-lg px-3.5 text-xs font-semibold",
        lg: "h-11 rounded-xl px-6 text-base font-bold",
        icon: "h-10 w-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props} />
    );
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
