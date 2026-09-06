"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";

// Soft masks retain the original pixels and shadows during the brief entrance.
// The original photograph covers these layers once every object has settled.
const pieces = [
  { name: "plant", shape: "480,0 899,0 883,107 830,207 637,224 494,161", x: -24, y: -65 },
  { name: "laptop", shape: "910,80 1233,183 1253,321 1177,448 794,315 783,283", x: 45, y: -55 },
  { name: "headphones", shape: "1253,129 1352,121 1446,172 1470,257 1441,331 1366,393 1257,364 1182,297 1187,206", x: 75, y: -25 },
  { name: "phone", shape: "726,380 832,342 858,350 925,521 900,584 813,603 799,580", x: 20, y: 65 },
  { name: "glasses", shape: "944,411 1032,413 1194,467 1199,549 1066,546 941,493", x: 65, y: 12 },
  { name: "earbuds", shape: "905,508 978,505 1025,534 1023,613 1001,641 891,622 886,567", x: 20, y: 65 },
  { name: "coffee", shape: "645,498 712,495 762,527 776,608 747,664 692,682 637,649 611,574", x: -45, y: 40 },
  { name: "bottle", shape: "1391,326 1463,322 1505,367 1385,617 1334,625 1274,580 1282,537", x: 85, y: -20 },
  { name: "camera", shape: "1110,561 1165,552 1262,591 1325,641 1300,755 1230,793 1094,803 1032,751 1042,650", x: 75, y: 55 },
  { name: "notebook", shape: "814,611 1021,684 1024,735 922,943 841,927 710,852 708,783", x: 25, y: 80 },
  { name: "shoe", shape: "512,642 568,642 611,676 656,696 686,760 739,830 800,888 809,940 776,971 699,968 568,889 452,795 418,749 454,681", x: -60, y: 65 },
  { name: "kitchen", shape: "1536,446 1485,457 1440,502 1417,598 1441,666 1380,687 1342,734 1357,800 1536,936", x: 95, y: 30 },
  { name: "candle", shape: "1289,782 1349,783 1385,822 1379,879 1419,874 1471,924 1475,996 1425,1024 1353,980 1270,960 1234,913 1244,838", x: 45, y: 75 },
  { name: "blanket", shape: "0,724 91,721 211,765 306,835 409,913 574,1024 0,1024", x: -55, y: 55 },
];

export function LandingArtwork() {
  const id = useId().replaceAll(":", "");
  const scene = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motion.matches) return;
    let cancelled = false;
    const images = ["/images/landing-flatlay.png", "/images/landing-marble.png"].map((src) => {
      const image = new window.Image();
      image.src = src;
      return image.decode();
    });
    Promise.all(images).then(() => { if (!cancelled) setReady(true); }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!ready || !scene.current) return;
    const animations = Array.from(scene.current.querySelectorAll("[data-piece]"), (node, index) => {
      const piece = pieces[index];
      return node.animate([
        { transform: `translate(${piece.x}px, ${piece.y}px)`, opacity: 0 },
        { transform: "translate(0, 0)", opacity: 1 },
      ], { duration: 700, delay: index * 24, easing: "cubic-bezier(.2,.75,.25,1)", fill: "both" });
    });
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finish = () => animations.forEach((animation) => animation.finish());
    motion.addEventListener("change", finish);
    return () => { motion.removeEventListener("change", finish); animations.forEach((animation) => animation.cancel()); };
  }, [ready]);

  return (
    <div ref={scene} className={`landing-artwork${ready ? " artwork-ready" : ""}${failed ? " artwork-failed" : ""}`} aria-hidden="true">
      <noscript><style>{".landing-still { opacity: 1; }"}</style></noscript>
      <div className="landing-canvas">
        <Image src="/images/landing-marble.png" alt="" fill unoptimized sizes="100vw" className="landing-plate" />
        <Image src="/images/landing-flatlay.png" alt="" fill unoptimized preload sizes="100vw" className="landing-photo landing-still" />
        {ready && <svg className="landing-layers" viewBox="0 0 1536 1024">
          <image href="/images/landing-marble.png" width="1536" height="1024" preserveAspectRatio="none" />
          <defs>
            <filter id={`${id}-soft-edge`}><feGaussianBlur stdDeviation="7" /></filter>
            {pieces.map((piece) => <mask key={piece.name} id={`${id}-${piece.name}`} maskUnits="userSpaceOnUse" x="0" y="0" width="1536" height="1024"><polygon points={piece.shape} fill="white" filter={`url(#${id}-soft-edge)`} /></mask>)}
          </defs>
          {pieces.map((piece) => <g key={piece.name} data-piece={piece.name}><image href="/images/landing-flatlay.png" width="1536" height="1024" mask={`url(#${id}-${piece.name})`} /></g>)}
        </svg>}
      </div>
    </div>
  );
}
