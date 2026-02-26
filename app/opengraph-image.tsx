import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "x402 demo · Base Sepolia";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#09090b",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "72px 80px",
          fontFamily: "monospace",
        }}
      >
        {/* Badge */}
        <div style={{ display: "flex", marginBottom: "36px" }}>
          <div
            style={{
              background: "rgba(16,185,129,0.1)",
              border: "1px solid rgba(16,185,129,0.25)",
              color: "#34d399",
              fontSize: "18px",
              fontWeight: 600,
              padding: "8px 18px",
              borderRadius: "6px",
              letterSpacing: "0.02em",
            }}
          >
            HTTP 402 Payment Required
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            color: "#ffffff",
            fontSize: "96px",
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: "-3px",
            marginBottom: "28px",
          }}
        >
          x402 demo
        </div>

        {/* Subtitle */}
        <div
          style={{
            color: "#71717a",
            fontSize: "30px",
            lineHeight: 1.4,
            flex: 1,
          }}
        >
          Pay-per-request APIs with USDC.{"\n"}No subscriptions. No API keys.
        </div>

        {/* Bottom row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid #27272a",
            paddingTop: "36px",
          }}
        >
          {/* curl snippet */}
          <div
            style={{
              background: "#18181b",
              border: "1px solid #27272a",
              color: "#a1a1aa",
              fontSize: "20px",
              padding: "16px 24px",
              borderRadius: "10px",
              letterSpacing: "0.01em",
            }}
          >
            <span style={{ color: "#52525b" }}>$ </span>
            curl -i x402.llmer.com/api/cowsays
          </div>

          {/* Network pill */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: "6px",
            }}
          >
            <div
              style={{ color: "#34d399", fontSize: "22px", fontWeight: 700 }}
            >
              0.001 USDC / request
            </div>
            <div style={{ color: "#52525b", fontSize: "16px" }}>
              Base Sepolia · eip155:84532
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
