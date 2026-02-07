"use client";
import { signIn, signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Input } from "@/components/ui/input";

export function Appbar() {
    const session = useSession();
    return <div className="w-full flex justify-center pt-4 px-4 md:px-6">
        <div className="flex justify-between w-full max-w-screen-xl items-center">
            <div className="text-lg font-bold flex flex-col justify-center text-white">
                Softwave
            </div>
            <div>
                {!session.data?.user && <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => signIn()}>SignIn</Button>}
                {session.data?.user && <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => signOut()}>SignOut</Button>}
            </div>
        </div>
    </div>
}