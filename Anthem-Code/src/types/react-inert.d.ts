import "react";

declare module "react" {
  interface HTMLAttributes<T> {
    /** React 18 only renders `inert` when passed as a string; use `""` to enable, `undefined` to remove. */
    inert?: "" | undefined;
  }
}
