import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
//@ts-ignore
import { Users, Radio, Headphones } from "lucide-react";
//import { Appbar } from "@/components/Appbar";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Appbar } from "./components/Appbar";
import { Redirect } from "./components/Redirect";
//import { authOptions } from "@/lib/auth-options";

export default async function LandingPage() {
  //const session = await getServerSession(authOptions);


  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900">
      <header className="px-4 lg:px-6 h-16 flex items-center">
        <Appbar />
        <Redirect />
      </header>
      <main className="flex-1 py-12 md:py-24 lg:py-32 flex items-center justify-center">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tighter text-white sm:text-4xl md:text-5xl lg:text-6xl/none">
                Let Your Fans Choose the Beat
              </h1>
              <p className="mx-auto max-w-[700px] text-gray-400 md:text-xl">
                Empower your audience to curate your music stream. Connect with
                fans like never before.
              </p>
            </div>
            <div className="space-x-4">
              <Button className="bg-blue-600 text-white hover:bg-blue-700">
                <Link
                  href={{
                    pathname: "/auth",
                    query: { authType: "signUp" },
                  }}
                >
                  Get Started
                </Link>
              </Button>
              <Button className="bg-white text-blue-500 hover:bg-white/90">
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </main>
      <section className="w-full bg-gray-800 bg-opacity-50 py-12 md:py-24 lg:py-32 flex items-center justify-center">
        <div className="container px-4 md:px-6">
          <h2 className="mb-8 text-center text-2xl font-bold tracking-tighter text-white sm:text-3xl">
            Key Features
          </h2>
          <div className="grid gap-8 sm:grid-cols-3">
            <div className="flex flex-col items-center space-y-3 text-center">
              <Users className="h-12 w-12 text-yellow-400" />
              <h3 className="text-xl font-bold text-white">Fan Interaction</h3>
              <p className="text-gray-400">Let fans choose the music.</p>
            </div>
            <div className="flex flex-col items-center space-y-3 text-center">
              <Radio className="h-12 w-12 text-green-400" />
              <h3 className="text-xl font-bold text-white">Live Streaming</h3>
              <p className="text-gray-400">Stream with real-time input.</p>
            </div>
            <div className="flex flex-col items-center space-y-3 text-center">
              <Headphones className="h-12 w-12 text-blue-400" />
              <h3 className="text-xl font-bold text-white">
                High-Quality Audio
              </h3>
              <p className="text-gray-400">Crystal clear sound quality.</p>
            </div>
          </div>
        </div>
      </section>
      <section className="w-full py-12 md:py-24 lg:py-32 flex items-center justify-center">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter text-white sm:text-4xl">
                Ready to Transform Your Streams?
              </h2>
              <p className="mx-auto max-w-[600px] text-gray-400 md:text-xl">
                Join MusicStreamChoice today and create unforgettable
                experiences.
              </p>
            </div>
            <div className="w-full max-w-sm">
              {/*<form className="flex space-x-2">
                 <Input
                  className="focus-visible:ring-offset-0 focus-visible:ring-blue-600 bg-gray-800  bg-opacity-50 placeholder:text-gray-400 border-gray-400 text-white"
                  placeholder="Enter your email"
                  ref={mailRef}
                  type="email"
                /> */}
              <Link
                href={{
                  pathname: "/auth",
                  query: {
                    authType: "signUp",
                  },
                }}
              >
                <Button
                  type="submit"
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  Sign Up
                </Button>
              </Link>
              {/* </form> */}
            </div>
          </div>
        </div>
      </section>
      <footer className="flex w-full shrink-0 flex-col items-center gap-2 border-t border-gray-700 px-4 py-6 sm:flex-row md:px-6 ">
        <p className="text-xs text-gray-400">
          © 2023 MusicStreamChoice. All rights reserved.
        </p>
        <nav className="flex gap-4 sm:ml-auto sm:gap-6">
          <Link
            className="text-xs text-gray-400 transition-colors hover:text-cyan-400"
            href="#"
          >
            Terms of Service
          </Link>
          <Link
            className="text-xs text-gray-400 transition-colors hover:text-cyan-400"
            href="#"
          >
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  );
}