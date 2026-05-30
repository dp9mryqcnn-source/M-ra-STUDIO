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
          background: "linear-gradient(135deg, #F6E7E1, #D6BD9F)",
        }}
      >
        <span style={{ fontSize: 74, fontWeight: 700, color: "#8E7E73", fontFamily: "Georgia, serif", fontStyle: "italic" }}>
          MLB
        </span>
      </div>
    ),
    { ...size }
  );
}
