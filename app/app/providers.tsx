"use client";

import { SessionProvider } from "next-auth/react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>
    {children}
    <ToastContainer theme="dark" position="bottom-right" />
  </SessionProvider>;
}

