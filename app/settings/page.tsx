import React from "react";
import { DashboardShell } from "@/components/layout/shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  return (
    <DashboardShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your personal workspace properties, dark theme preferences, and credentials.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Profile Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1.5">
                  <label className="text-sm font-medium">Full Name</label>
                  <input className="border rounded-md px-3 py-2 text-sm bg-background" defaultValue="Blur Admin Admin" />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <label className="text-sm font-medium">Email Address</label>
                  <input className="border rounded-md px-3 py-2 text-sm bg-background" defaultValue="admin@bluradmin.com" />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <label className="text-sm font-medium">Phone</label>
                  <input className="border rounded-md px-3 py-2 text-sm bg-background" placeholder="+1 (555) 019-2834" />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <label className="text-sm font-medium">Location</label>
                  <input className="border rounded-md px-3 py-2 text-sm bg-background" placeholder="New York, USA" />
                </div>
              </div>
              <Button className="w-full md:w-auto mt-4">Save Profile</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Email Alerts</p>
                  <p className="text-xs text-muted-foreground">Receive real-time system diagnostic emails</p>
                </div>
                <input type="checkbox" defaultChecked className="h-4 w-4 text-primary rounded" />
              </div>
              <div className="flex items-center justify-between border-t pt-4">
                <div>
                  <p className="text-sm font-semibold">Weekly Summary</p>
                  <p className="text-xs text-muted-foreground">Receive compiled weekly user activity digests</p>
                </div>
                <input type="checkbox" className="h-4 w-4 text-primary rounded" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}