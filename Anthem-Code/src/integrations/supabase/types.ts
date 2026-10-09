/**
 * App-facing database types.
 *
 * `supabase.from("x")` is routed at runtime to the `public`, `shared` or `anthem` schema
 * (see db.ts + tableRouting.ts). This file builds a `Database` type whose `public` schema
 * mirrors that routing, so TypeScript sees each table where the app actually reads it.
 * Raw per-schema types live in ./types.generated (regenerate, never hand-edit).
 */
import type { Database as GeneratedDatabase, Json } from "./types.generated";
import type {
  AnthemRpcName,
  PublicTableName,
  SharedRpcName,
  SharedTableName,
} from "./tableRouting";

export type { Json, GeneratedDatabase };
export { Constants } from "./types.generated";

type G = GeneratedDatabase;
type Routed = PublicTableName | SharedTableName;

type PickKnown<T, K> = Pick<T, Extract<K, keyof T>>;

/** Flat merge (later wins). A flat object keeps PostgREST's type inference shallow. */
type Merge3<A, B, C> = {
  [K in keyof A | keyof B | keyof C]: K extends keyof C
    ? C[K]
    : K extends keyof B
      ? B[K]
      : K extends keyof A
        ? A[K]
        : never;
};

type RoutedTables = Merge3<
  Omit<G["anthem"]["Tables"], Routed>,
  PickKnown<G["shared"]["Tables"], SharedTableName>,
  PickKnown<G["public"]["Tables"], PublicTableName>
>;

type RoutedViews = Merge3<
  Omit<G["anthem"]["Views"], Routed>,
  PickKnown<G["shared"]["Views"], SharedTableName>,
  PickKnown<G["public"]["Views"], PublicTableName>
>;

export type Database = Omit<G, "public"> & {
  public: {
    Tables: RoutedTables;
    Views: RoutedViews;
    /** `supabase.rpc` is routed by name (db.ts → schemaForRpc). */
    Functions: Merge3<
      G["public"]["Functions"],
      PickKnown<G["anthem"]["Functions"], AnthemRpcName>,
      PickKnown<G["shared"]["Functions"], SharedRpcName>
    >;
    Enums: G["public"]["Enums"];
    CompositeTypes: G["public"]["CompositeTypes"];
  };
};

type PublicSchema = Database["public"];

export type Tables<
  T extends keyof (PublicSchema["Tables"] & PublicSchema["Views"]),
> = (PublicSchema["Tables"] & PublicSchema["Views"])[T] extends { Row: infer R }
  ? R
  : never;

export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T] extends {
    Insert: infer I;
  }
    ? I
    : never;

export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T] extends {
    Update: infer U;
  }
    ? U
    : never;

export type Enums<T extends keyof PublicSchema["Enums"]> =
  PublicSchema["Enums"][T];
