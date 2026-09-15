import "./globals.css";

export const metadata = {
  title: "ReplyLocal",
  description:
    "Free Google review reply generator for local businesses. Paste a review, get a polished reply to copy.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
