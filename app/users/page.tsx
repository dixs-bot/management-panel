import React from "react";
import { DashboardShell } from "@/components/layout/shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from "@/components/ui/table";

const mockUsers = [
  { id: "1", name: "Alexander Lugovsky", email: "v.lugovsky@akveo.com", role: "ADMIN", status: "Active" },
  { id: "2", name: "Inna Litvinka", email: "i.litvinka@akveo.com", role: "DEVELOPER", status: "Active" },
  { id: "3", name: "Eugene Shikhov", email: "eugene@akveo.com", role: "DEVELOPER", status: "Inactive" },
  { id: "4", name: "Siarhei Siamashka", email: "s.siamashka@akveo.com", role: "DESIGNER", status: "Active" },
  { id: "5", name: "Dmitry Akveo", email: "dmitry@akveo.com", role: "USER", status: "Active" },
];

export default function UsersPage() {
  return (
    <DashboardShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Directory</h1>
          <p className="text-muted-foreground mt-1">
            Fully responsive TanStack Table implementation of BlurAdmin smart users directory.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Active Workspace Members</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email Address</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-semibold">{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <span className="inline-flex px-2.5 py-1 text-xs font-semibold rounded-full bg-primary/10 text-primary">
                        {u.role}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${
                        u.status === "Active" ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground"
                      }`}>
                        {u.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}