"use client";
import { createContext, useContext } from "react";

/** True when rendering inside the portal's phone frame (sheets stay bottom sheets there). */
export const FrameCtx = createContext(false);
export const useInFrame = () => useContext(FrameCtx);

/** Landing page: which demo household (if any) is open inside the phone. */
export const PreviewCtx = createContext<{ preview: string | null; setPreview: (id: string | null) => void } | null>(null);
export const usePreview = () => useContext(PreviewCtx);
