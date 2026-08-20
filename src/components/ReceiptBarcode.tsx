"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

export default function ReceiptBarcode({ value }: { value: string }) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current || !value) return;
    JsBarcode(ref.current, value, {
      format: "CODE128",
      displayValue: true,
      font: "Arial",
      fontSize: 12,
      textMargin: 3,
      margin: 0,
      height: 42,
      width: 1.4,
    });
  }, [value]);

  if (!value) return null;
  return <svg ref={ref} className="mx-auto block max-w-full" />;
}
