"use client";

import { DatabaseProvider } from "./DatabaseProvider";

export default function Providers({ children }) {
  return <DatabaseProvider>{children}</DatabaseProvider>;
}
