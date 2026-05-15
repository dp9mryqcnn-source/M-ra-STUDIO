import { ImageResponse } from "next/og";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 192,
          height: 192,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 40,
          background: "linear-gradient(135deg, #7c3aed, #ec4899)",
        }}
      >
        <span style={{ fontSize: 110, fontWeight: 900, color: "white", fontFamily: "serif" }}>
          M
        </span>
      </div>
    ),
    { ...size }
  );
}
