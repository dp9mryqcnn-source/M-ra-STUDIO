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
          borderRadius: 44,
          background: "linear-gradient(135deg, #F6E7E1, #D6BD9F)",
        }}
      >
        <span style={{ fontSize: 78, fontWeight: 700, color: "#8E7E73", fontFamily: "Georgia, serif", fontStyle: "italic" }}>
          MLB
        </span>
      </div>
    ),
    { ...size }
  );
}
