import { Poppins } from "next/font/google";
import {ClerkProvider} from "@clerk/nextjs"
import "./globals.css";
import { connectToDatabase } from "@/lib/mongodb/database";
const poppins = Poppins({ subsets: ["latin"],
  weight : ['400','500','600','700'],
  variable : '--font-poppins'
 });

export const metadata = {
  title: "Evently",
  description: "Evently is a platform for event management",
  icons : {
    icon : "/public/assets/images/logo.svg"
  }
};

export default function RootLayout({ children }) {
  connectToDatabase()
  return (
    <ClerkProvider>
    <html lang="en">
      <body className={poppins.className}>{children}</body>
    </html>
    </ClerkProvider>
  );
}
