"use client";

/**
 * Jedno mesto za registraciju GSAP plugin-a. Sve komponente uvoze gsap odavde
 * da se ScrollTrigger, Flip i useGSAP registruju tačno jednom.
 */
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Flip } from "gsap/Flip";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, Flip, useGSAP);

/** Ulaz sekcija — DNA motion.easing (cubic-bezier(.16,1,.3,1) ≈ expo.out). */
export const EASE_ENTER = "expo.out";

export { gsap, ScrollTrigger, Flip, useGSAP };
