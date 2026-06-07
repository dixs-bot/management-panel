"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useUserStore } from "@/store/ui";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const { login, user } = useUserStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && name) {
      login(email, name);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8 bg-card text-card-foreground p-8 rounded-lg border shadow-sm">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-primary">Register</h1>
          <p className="text-muted-foreground mt-2">
            Initialize your profile on modernized BlurAdmin.
          </p>
        </div>

        {user ? (
          <div className="space-y-4 text-center">
            <p className="text-sm">Account initialized successfully for <span className="font-semibold">{user.name}</span></p>
            <Link href="/" className="inline-block text-sm text-primary hover:underline">
              Proceed to Dashboard
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Create Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              />
            </div>

            <Button type="submit" className="w-full">
              Register Admin Member
            </Button>
          </form>
        )}

        <div className="text-center text-sm text-muted-foreground mt-4">
          Already registered?{" "}
          <Link href="/login" className="text-primary hover:underline font-semibold">
            Sign In Instead
          </Link>
        </div>
      </div>
    </div>
  );
}