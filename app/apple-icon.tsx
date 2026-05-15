import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 38,
          background: "linear-gradient(135deg, #7c3aed, #ec4899)",
        }}
      >
        <span style={{ fontSize: 105, fontWeight: 900, color: "white", fontFamily: "serif" }}>
          M
        </span>
      </div>
    ),
    { ...size }
  );
}
